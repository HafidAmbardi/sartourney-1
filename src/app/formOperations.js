"use client";
import { useForms } from "./FormContext";
import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export function FormOperations() {
  const { forms, mode } = useForms();
  const [killData, setKillData] = useState({});
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState(null);
  const [roundResults, setRoundResults] = useState([]);
  const [totalTeamResults, setTotalTeamResults] = useState([]);
  const [showRoundResults, setShowRoundResults] = useState(true);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parseData = (text) => {
    if (!text || !text.trim()) return [];

    try {
      const lines = text.trim().split("\n");
      if (lines.length < 2) return [];

      const headers = lines[0].split("\t");
      return (
        lines
          .slice(1)
          .map((line) => {
            const values = line.split("\t");
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index];
              return obj;
            }, {});
          })
          // Filter out rows with empty PlayfabID
          .filter((row) => row.PlayfabID && row.PlayfabID.trim() !== "")
      );
    } catch (err) {
      setError(`Parse error: ${err.message}`);
      return [];
    }
  };

  const buildConsistentTeams = (forms) => {
    const teamHistory = new Map(); // Tracks all team compositions seen
    const playerTeams = new Map(); // Maps players to their team ID

    forms.forEach((form) => {
      const data = parseData(form.text);
      const matchTeams = new Map(); // Teams in current match

      // First pass: collect teams for this match
      data.forEach((row) => {
        const playfabID = row.PlayfabID;
        const squadID = row.SquadID;

        if (!matchTeams.has(squadID)) {
          matchTeams.set(squadID, new Set());
        }
        matchTeams.get(squadID).add(playfabID);
      });

      // Process teams from this match
      for (const [squadID, players] of matchTeams) {
        const playerArray = Array.from(players);
        let foundExistingTeam = false;

        // Check if these players belong to an existing team
        for (const [teamId, existingTeam] of teamHistory) {
          const intersection = playerArray.filter((p) => existingTeam.has(p));

          if (intersection.length > 0) {
            // If any player is already in a team
            const maxTeamSize = mode === "duo" ? 2 : mode === "squad" ? 4 : 1;

            if (
              intersection.length === existingTeam.size &&
              players.size <= maxTeamSize
            ) {
              // Update existing team if it's the same core team
              playerArray.forEach((p) => {
                existingTeam.add(p);
                playerTeams.set(p, teamId);
              });
              foundExistingTeam = true;
              break;
            }
          }
        }

        // Create new team if no existing team found
        if (!foundExistingTeam) {
          const teamId = `team_${teamHistory.size + 1}`;
          const newTeam = new Set(playerArray);
          teamHistory.set(teamId, newTeam);
          playerArray.forEach((p) => playerTeams.set(p, teamId));
        }
      }
    });

    // Convert to final format
    const finalTeams = [];
    for (const [teamId, players] of teamHistory) {
      finalTeams.push(Array.from(players));
    }

    return finalTeams;
  };

  const validateData = (data) => {
    const requiredFields = [
      "pID",
      "Player",
      "PlayfabID",
      "SquadID",
      "TeamID",
      "Kills",
      "Placement",
    ];
    return data.every(
      (row) =>
        requiredFields.every((field) => field in row) &&
        row.PlayfabID &&
        row.PlayfabID.trim() !== ""
    );
  };

  const calculateTotalKillsAndPoints = (forms) => {
    const result = {};
    const teamMap = {};

    forms.forEach((form) => {
      const data = parseData(form.text);
      if (!validateData(data)) {
        setError(`Invalid data format in form ${form.id}`);
        return;
      }

      let maxKills = 0;
      let maxKillsPlayers = [];

      data.forEach((row) => {
        const playfabID = row.PlayfabID;
        const squadID = row.SquadID;
        const kills = parseInt(row.Kills, 10) || 0;
        const placement = parseInt(row.Placement, 10) || 0;
        const pointsPerKill = form.pointsPerKill || 0;
        const killCap = form.killCap || 0;
        const points = killCap <= 0 ? kills * pointsPerKill : kills > killCap ? killCap * pointsPerKill : kills * pointsPerKill;

        // Calculate placement points
        let placementPoints = 0;
        form.ranges.forEach((range) => {
          if (placement >= range.start && placement <= range.end) {
            placementPoints += range.points;
          }
        });

        if (!result[playfabID]) {
          result[playfabID] = {
            kills: 0,
            points: 0,
            placementPoints: 0,
            playerName: row.Player, // Store first player name encountered
          };
        }

        result[playfabID].kills += kills;
        result[playfabID].points += points;
        result[playfabID].placementPoints += placementPoints;

        // Check for max kills
        if (kills > maxKills) {
          maxKills = kills;
          maxKillsPlayers = [playfabID];
        } else if (kills === maxKills) {
          maxKillsPlayers.push(playfabID);
        }

        // Nullify points if Pacifist Event is "yes" and kills > 0
        if (form.pacifist === "yes" && kills > 0) {
          result[playfabID].points = 0;
          result[playfabID].placementPoints = 0;
        }

        // Track teams
        if (!teamMap[squadID]) {
          teamMap[squadID] = new Set();
        }
        teamMap[squadID].add(playfabID);
      });

      // Add mostKillsBonus to the players with the most kills
      if (form.mostKillsBonus) {
        maxKillsPlayers.forEach((playfabID) => {
          if (result[playfabID] && form.pacifist !== "yes") {
            result[playfabID].points += form.mostKillsBonus;
          }
        });
      }
    });

    const processedTeams = buildConsistentTeams(forms);
    setTeams(processedTeams);

    // Calculate team points
    const teamPoints = calculateTeamPoints(forms);
    Object.entries(result).forEach(([playfabID, data]) => {
      result[playfabID].teamPoints = teamPoints[playfabID] || 0;
    });

    return result;
  };

  const calculateTeamPoints = (forms) => {
    return forms.map((form, roundIndex) => {
      const data = parseData(form.text);
      const roundTeams = new Map();

      // Group players by squad for this round
      data.forEach((row) => {
        const squadID = mode === "solo" ? row.PlayfabID : row.SquadID;
        if (!roundTeams.has(squadID)) {
          roundTeams.set(squadID, {
            players: [],
            totalKills: 0,
            bestPlacement: Infinity,
            points: 0,
            playerDetails: [],
          });
        }

        const kills = parseInt(row.Kills, 10) || 0;
        roundTeams.get(squadID).players.push(row.PlayfabID);
        roundTeams.get(squadID).totalKills += kills;
        roundTeams.get(squadID).bestPlacement = Math.min(
          roundTeams.get(squadID).bestPlacement,
          parseInt(row.Placement, 10) || Infinity
        );
        roundTeams.get(squadID).playerDetails.push({
          playfabID: row.PlayfabID,
          playerName: row.Player,
          kills: kills,
          killPoints: (form.killCap || 0) <= 0 ? kills * (form.pointsPerKill || 0) : kills > (form.killCap || 0) ? (form.killCap || 0) * (form.pointsPerKill || 0) : kills * (form.pointsPerKill || 0),
        });
      });

      // Calculate points for each team
      const roundResult = [];
      roundTeams.forEach((teamData, squadID) => {
        let killPoints = 0;
        let placementPoints = 0;
        if ((form.killCap || 0) <= 0) {
          killPoints = teamData.totalKills * (form.pointsPerKill || 0);
        } else if (teamData.totalKills > (form.killCap || 0)) {
          killPoints = (form.killCap || 0) * (form.pointsPerKill || 0);
        } else {
          killPoints = teamData.totalKills * (form.pointsPerKill || 0);
        }

        // Add placement points based on best placement
        form.ranges.forEach((range) => {
          if (
            teamData.bestPlacement >= range.start &&
            teamData.bestPlacement <= range.end
          ) {
            placementPoints = range.points;
          }
        });

        roundResult.push({
          squadID,
          players: teamData.playerDetails,
          totalKills: teamData.totalKills,
          placement: teamData.bestPlacement,
          killPoints,
          placementPoints,
          totalPoints: killPoints + placementPoints,
        });
      });

      return {
        roundNumber: roundIndex + 1,
        teams: roundResult,
      };
    });
  };

  const calculateTotalTeamResults = (roundResults) => {
    const teams = new Map(); // Map to store team info: key = teamId, value = team data
    let teamIdCounter = 1;

    roundResults.forEach((round) => {
      round.teams.forEach((currentTeam) => {
        const currentPlayers = new Set(
          currentTeam.players.map((p) => p.playfabID)
        );
        let matchedTeamId = null;

        // Check if this team composition matches any existing team
        for (const [teamId, existingTeam] of teams) {
          const existingPlayers = new Set(
            existingTeam.players.map((p) => p.playfabID)
          );
          const intersection = new Set(
            [...currentPlayers].filter((x) => existingPlayers.has(x))
          );

          // Case 1: Exact same team
          if (
            intersection.size === existingPlayers.size &&
            intersection.size === currentPlayers.size
          ) {
            matchedTeamId = teamId;
            break;
          }

          // Case 2: Team with members leaving (remaining players are the same)
          if (intersection.size === currentPlayers.size) {
            matchedTeamId = teamId;
            break;
          }

          // Case 3: Team with new member (check if new member isn't in other teams)
          const newMembers = [...currentPlayers].filter(
            (x) => !existingPlayers.has(x)
          );
          if (
            intersection.size === existingPlayers.size &&
            newMembers.length > 0
          ) {
            const newMemberInOtherTeam = newMembers.some((member) => {
              for (const [otherId, otherTeam] of teams) {
                if (
                  otherId !== teamId &&
                  otherTeam.players.some((p) => p.playfabID === member)
                ) {
                  return true;
                }
              }
              return false;
            });

            if (!newMemberInOtherTeam) {
              matchedTeamId = teamId;
              break;
            }
          }
        }

        if (matchedTeamId) {
          // Update existing team
          const team = teams.get(matchedTeamId);
          team.totalPoints += currentTeam.totalPoints;
          team.totalKills += currentTeam.totalKills;
          team.totalPlacementPoints += currentTeam.placementPoints;
          team.totalKillPoints += currentTeam.killPoints;
          team.rounds.push(round.roundNumber);

          // Update player list if needed
          currentTeam.players.forEach((player) => {
            if (!team.players.some((p) => p.playfabID === player.playfabID)) {
              team.players.push(player);
            }
          });
        } else {
          // Create new team
          teams.set(`team_${teamIdCounter}`, {
            id: teamIdCounter,
            players: [...currentTeam.players],
            totalPoints: currentTeam.totalPoints,
            totalKills: currentTeam.totalKills,
            totalPlacementPoints: currentTeam.placementPoints,
            totalKillPoints: currentTeam.killPoints,
            rounds: [round.roundNumber],
          });
          teamIdCounter++;
        }
      });
    });

    return Array.from(teams.values()).sort(
      (a, b) => b.totalPoints - a.totalPoints
    );
  };

  // Update processForms to include total team results calculation
  const processForms = () => {
    setError(null);
    try {
      const result = calculateTotalKillsAndPoints(forms);
      setKillData(result);
      const roundData = calculateTeamPoints(forms);
      setRoundResults(roundData);
      const totalTeamData = calculateTotalTeamResults(roundData);
      setTotalTeamResults(totalTeamData);
    } catch (err) {
      setError(`Processing error: ${err.message}`);
    }
  };
  useEffect(() => {
    processForms();
  }, [forms, mode]);

  if (!mounted) {
    return null; // Render nothing on the server
  }

  return (
    <div className={`w-full ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-4 max-w-4xl mx-auto ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}
      >
        <div
          className={`w-full rounded-lg shadow-md p-6 ${
            theme === "dark" ? "bg-gray-700" : "bg-white"
          }`}
        >
          <h2
            className={`text-2xl font-bold mb-6 text-center ${
              theme === "dark" ? "text-white" : "text-gray-900"
            } ${theme === "light" ? "text-black" : ""}`}
          >
            Results
          </h2>
          {error && (
            <div
              className={`text-red-500 p-4 mb-4 rounded-md ${
                theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-50"
              }`}
            >
              {error}
            </div>
          )}
          <div
            className={`rounded-lg p-4 ${
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            }`}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              } ${theme === "light" ? "text-black" : ""}`}
            >
              Total Player Points
            </h3>
            <table
              className={`min-w-full ${
                theme === "dark" ? "bg-gray-700" : "bg-white"
              }`}
            >
              <thead>
                <tr>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    Player
                  </th>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    PlayfabID
                  </th>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    Kills
                  </th>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    Kill Points
                  </th>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    Placement Points
                  </th>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    Total Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(killData).map(([playfabID, data]) => (
                  <tr
                    key={playfabID}
                    className={`${theme === "dark" ? "text-gray-200" : ""}`}
                  >
                    <td
                      className={`py-2 px-4 border-b ${
                        theme === "dark" ? "border-gray-600" : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      {data.playerName}
                    </td>
                    <td
                      className={`py-2 px-4 border-b ${
                        theme === "dark" ? "border-gray-600" : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      {playfabID}
                    </td>
                    <td
                      className={`py-2 px-4 border-b text-blue-600 font-semibold ${
                        theme === "dark"
                          ? "border-gray-600 text-blue-400"
                          : "border-gray-200"
                      }`}
                    >
                      {data.kills}
                    </td>
                    <td
                      className={`py-2 px-4 border-b text-green-600 font-semibold ${
                        theme === "dark"
                          ? "border-gray-600 text-green-400"
                          : "border-gray-200"
                      }`}
                    >
                      {data.points}
                    </td>
                    <td
                      className={`py-2 px-4 border-b text-purple-600 font-semibold ${
                        theme === "dark"
                          ? "border-gray-600 text-purple-400"
                          : "border-gray-200"
                      }`}
                    >
                      {data.placementPoints}
                    </td>
                    <td
                      className={`py-2 px-4 border-b text-orange-600 font-semibold ${
                        theme === "dark"
                          ? "border-gray-600 text-orange-400"
                          : "border-gray-200"
                      }`}
                    >
                      {data.points + data.placementPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="w-full flex justify-center mt-6 mb-2">
          <button
            onClick={() => setShowRoundResults(!showRoundResults)}
            className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center ${
              theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : ""
            }`}
          >
            {showRoundResults ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Hide Round Results
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Show Round Results
              </>
            )}
          </button>
        </div>
        <div
          className={`transition-all duration-300 ${
            showRoundResults ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
          }`}
        >
          {roundResults.map((round, roundIndex) => (
            <div
              key={roundIndex}
              className={`rounded-lg p-4 mt-6 ${
                theme === "dark" ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <h3
                className={`text-xl font-semibold mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                } ${theme === "light" ? "text-black" : ""}`}
              >
                Round {round.roundNumber} Results
              </h3>
              <table
                className={`min-w-full ${
                  theme === "dark" ? "bg-gray-700" : "bg-white"
                }`}
              >
                <thead>
                  <tr>
                    <th
                      className={`py-2 px-4 border-b ${
                        theme === "dark"
                          ? "border-gray-600 text-gray-200"
                          : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      Team
                    </th>
                    <th
                      className={`py-2 px-4 border-b ${
                        theme === "dark"
                          ? "border-gray-600 text-gray-200"
                          : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      Player
                    </th>
                    <th
                      className={`py-2 px-4 border-b ${
                        theme === "dark"
                          ? "border-gray-600 text-gray-200"
                          : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      PlayfabID
                    </th>
                    <th
                      className={`py-2 px-4 border-b ${
                        theme === "dark"
                          ? "border-gray-600 text-gray-200"
                          : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      Kills
                    </th>
                    <th
                      className={`py-2 px-4 border-b ${
                        theme === "dark"
                          ? "border-gray-600 text-gray-200"
                          : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      Kill Points
                    </th>
                    <th
                      className={`py-2 px-4 border-b ${
                        theme === "dark"
                          ? "border-gray-600 text-gray-200"
                          : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      Team Placement
                    </th>
                    <th
                      className={`py-2 px-4 border-b ${
                        theme === "dark"
                          ? "border-gray-600 text-gray-200"
                          : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      Placement Points
                    </th>
                    <th
                      className={`py-2 px-4 border-b ${
                        theme === "dark"
                          ? "border-gray-600 text-gray-200"
                          : "border-gray-200"
                      } ${theme === "light" ? "text-black" : ""}`}
                    >
                      Total Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {round.teams.map((team, teamIndex) => (
                    <React.Fragment key={teamIndex}>
                      {team.players.map((player, playerIndex) => (
                        <tr
                          key={`${teamIndex}-${playerIndex}`}
                          className={`${
                            theme === "dark" ? "text-gray-200" : ""
                          }`}
                        >
                          {playerIndex === 0 && (
                            <td
                              className={`py-2 px-4 border-b ${
                                theme === "dark"
                                  ? "border-gray-600"
                                  : "border-gray-200"
                              } ${theme === "light" ? "text-black" : ""}`}
                              rowSpan={team.players.length}
                            >
                              {mode === "solo"
                                ? player.playerName
                                : `Team ${teamIndex + 1}`}
                            </td>
                          )}
                          <td
                            className={`py-2 px-4 border-b ${
                              theme === "dark"
                                ? "border-gray-600"
                                : "border-gray-200"
                            } ${theme === "light" ? "text-black" : ""}`}
                          >
                            {player.playerName}
                          </td>
                          <td
                            className={`py-2 px-4 border-b ${
                              theme === "dark"
                                ? "border-gray-600"
                                : "border-gray-200"
                            } ${theme === "light" ? "text-black" : ""}`}
                          >
                            {player.playfabID}
                          </td>
                          <td
                            className={`py-2 px-4 border-b text-blue-600 font-semibold ${
                              theme === "dark"
                                ? "border-gray-600 text-blue-400"
                                : "border-gray-200"
                            }`}
                          >
                            {player.kills}
                          </td>
                          {playerIndex === 0 && (
                            <>
                              <td
                                className={`py-2 px-4 border-b text-green-600 font-semibold ${
                                  theme === "dark"
                                    ? "border-gray-600 text-green-400"
                                    : "border-gray-200"
                                }`}
                                rowSpan={team.players.length}
                              >
                                {team.killPoints}
                              </td>
                              <td
                                className={`py-2 px-4 border-b ${
                                  theme === "dark"
                                    ? "border-gray-600"
                                    : "border-gray-200"
                                } ${theme === "light" ? "text-black" : ""}`}
                                rowSpan={team.players.length}
                              >
                                {team.placement}
                              </td>
                              <td
                                className={`py-2 px-4 border-b text-purple-600 font-semibold ${
                                  theme === "dark"
                                    ? "border-gray-600 text-purple-400"
                                    : "border-gray-200"
                                }`}
                                rowSpan={team.players.length}
                              >
                                {team.placementPoints}
                              </td>
                              <td
                                className={`py-2 px-4 border-b text-orange-600 font-semibold ${
                                  theme === "dark"
                                    ? "border-gray-600 text-orange-400"
                                    : "border-gray-200"
                                }`}
                                rowSpan={team.players.length}
                              >
                                {team.totalPoints}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {!(mode === "solo") && (
          <div
            className={`rounded-lg p-4 mt-6 ${
              theme === "dark" ? "bg-gray-800" : "bg-gray-50"
            }`}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              } ${theme === "light" ? "text-black" : ""}`}
            >
              Total Team Results
            </h3>
            <table
              className={`min-w-full ${
                theme === "dark" ? "bg-gray-700" : "bg-white"
              }`}
            >
              <thead>
                <tr>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    Team
                  </th>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    Players
                  </th>
                  <th
                    className={`py-2 px-4 border-b text-blue-600 font-semibold ${
                      theme === "dark"
                        ? "border-gray-600 text-blue-400"
                        : "border-gray-200"
                    }`}
                  >
                    Total Kills
                  </th>
                  <th
                    className={`py-2 px-4 border-b text-green-600 font-semibold ${
                      theme === "dark"
                        ? "border-gray-600 text-green-400"
                        : "border-gray-200"
                    }`}
                  >
                    Total Kill Points
                  </th>
                  <th
                    className={`py-2 px-4 border-b text-purple-600 font-semibold ${
                      theme === "dark"
                        ? "border-gray-600 text-purple-400"
                        : "border-gray-200"
                    }`}
                  >
                    Total Placement Points
                  </th>
                  <th
                    className={`py-2 px-4 border-b text-orange-600 font-semibold ${
                      theme === "dark"
                        ? "border-gray-600 text-orange-400"
                        : "border-gray-200"
                    }`}
                  >
                    Total Points
                  </th>
                  <th
                    className={`py-2 px-4 border-b ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-200"
                        : "border-gray-200"
                    } ${theme === "light" ? "text-black" : ""}`}
                  >
                    Rounds Played
                  </th>
                </tr>
              </thead>
              <tbody>
                {totalTeamResults.map((team) => (
                  <tr
                    key={team.id}
                    className={`${theme === "dark" ? "text-gray-200" : ""} ${
                      theme === "light" ? "text-black" : ""
                    }`}
                  >
                    <td
                      className={`py-2 px-4 border-b ${
                        theme === "dark" ? "border-gray-600" : "border-gray-200"
                      }`}
                    >
                      Team {team.id}
                    </td>
                    <td
                      className={`py-2 px-4 border-b ${
                        theme === "dark" ? "border-gray-600" : "border-gray-200"
                      }`}
                    >
                      {team.players.map((p) => p.playerName).join(", ")}
                    </td>
                    <td
                      className={`py-2 px-4 border-b text-blue-600 font-semibold ${
                        theme === "dark"
                          ? "border-gray-600 text-blue-400"
                          : "border-gray-200"
                      }`}
                    >
                      {team.totalKills}
                    </td>
                    <td
                      className={`py-2 px-4 border-b text-green-600 font-semibold ${
                        theme === "dark"
                          ? "border-gray-600 text-green-400"
                          : "border-gray-200"
                      }`}
                    >
                      {team.totalKillPoints}
                    </td>
                    <td
                      className={`py-2 px-4 border-b text-purple-600 font-semibold ${
                        theme === "dark"
                          ? "border-gray-600 text-purple-400"
                          : "border-gray-200"
                      }`}
                    >
                      {team.totalPlacementPoints}
                    </td>
                    <td
                      className={`py-2 px-4 border-b text-orange-600 font-semibold ${
                        theme === "dark"
                          ? "border-gray-600 text-orange-400"
                          : "border-gray-200"
                      }`}
                    >
                      {team.totalPoints}
                    </td>
                    <td
                      className={`py-2 px-4 border-b ${
                        theme === "dark" ? "border-gray-600" : "border-gray-200"
                      }`}
                    >
                      {team.rounds.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
