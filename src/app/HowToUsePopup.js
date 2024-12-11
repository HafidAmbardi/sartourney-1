import { useEffect } from "react";
import Image from "next/image";

function HowToUsePopup({ theme, onClose }) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div
        className={`relative p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto ${
          theme === "dark"
            ? "bg-gray-800 text-gray-200"
            : "bg-white text-gray-900"
        } animate-fade-in`}
      >
        <button
          className="absolute top-2 right-2 text-2xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-3xl font-bold mb-6 text-center">How to Use</h2>
        <p className="mb-4">
          For starters, I do <strong>NOT</strong> take responsibility for any
          miscalculations. Always be sure to double check the results. By
          continuing to use the website, you acknowledge and take responsibility
          for any of the risks involved.
        </p>
        <p className="mb-4">
          With that out of the way, here are some basic instructions:
        </p>

        <table className="w-full mb-6 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="p-2 border">Step 1</td>
              <td className="p-2 border">
                Choose solo, duo, or squad mode for your tournament.
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">Step 2</td>
              <td className="p-2 border">
                {`At the end of every round, paste the round data from /getplayers
                into the large text box. (DO NOT USE /score)`}
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">Step 3</td>
              <td className="p-2 border">
                Fill in the config according to your tournament rules.
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">Step 4</td>
              <td className="p-2 border">
                {` If there are multiple rounds, click "Add Page". A new text box
                should appear underneath the previous round. Repeat steps 1 and
                2 for the new round.`}
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold mb-4">Tables</h3>
        <table className="w-full mb-6 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Total Player Points Table:</strong>
              </td>
              <td className="p-2 border">
                {`If you scroll down, you can see the "Results" table which shows the scoring of each player based on the previous configs.`}
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Rounds Table:</strong>
              </td>
              <td className="p-2 border">
                {`You can view the scores for each round by clicking on "Show Round Results".`}
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Total Team Results Table:</strong>
              </td>
              <td className="p-2 border">
                If you are in duo or squad mode, you can view the points for
                each team.
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold mb-4">Config Explanation</h3>
        <table className="w-full mb-6 border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Config Name:</strong>
              </td>
              <td className="p-2 border">
                The name of the config, it does not affect scoring.
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Points per Kill:</strong>
              </td>
              <td className="p-2 border">
                The amount of points given per kill.
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Kill Cap:</strong>
              </td>
              <td className="p-2 border">
                The maximum number of kills that get scored. Any kill above
                this threshold will not be awarded points. When set to "0",
                the cap is disabled.
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Points per Placement:</strong>
              </td>
              <td className="p-2 border">
                {`The amount of points given per placement. Points are determined by ranges, for example, from 1st to 10th place, players will receive 5 points. Click "Add Range" to add more ranges, and "Remove" to remove ranges.`}
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Pacifist Round:</strong>
              </td>
              <td className="p-2 border">
                {`When set to "Yes", the player will receive 0 points for that round if they have more than 0 kills.`}
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Most Kills Bonus:</strong>
              </td>
              <td className="p-2 border">
                Rewards the player with the most kills with bonus points. If
                there are multiple players with most kills, then all players
                will receive the bonus for that round.
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 border">
                <strong>Export & Import Config:</strong>
              </td>
              <td className="p-2 border">
                {`You can save the config of a round by clicking "Export Config" storing the config to your clipboard. To load a config, click "Import Config" and paste the previously exported config into the text box. After pasting, click "Confirm".`}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mb-4">
          {`A few notes, I've tried to implement squad tracking that accounts for players leaving / joining mid-tournament, but just double check the squads again to make sure everything is consistent. If there is a player that changes teams mid tournament, the new merged team will count as a new team entirely.`}
        </p>
        <p className="mb-16">
          {`That's all really! I hope Pixile doesn't change the format of the round data because the whole website would just crumble. I also hope this website helps you out in your tournaments!!! If you have any questions, feel free to reach out to me on discord at "a.plain.bowl.of.white.rice".`}
        </p>
        <div className="flex flex-col items-start">
          <p className="mb-8">{`Happy Hosting! :)`}</p>
          <div className="flex items-center">
            <p className="mr-2">- A Plain Bowl Of White Rice</p>
            <Image
              src="/rice_dancing.gif"
              alt="Example GIF 4"
              width={60}
              height={60}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowToUsePopup;
