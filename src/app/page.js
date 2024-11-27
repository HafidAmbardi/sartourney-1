"use client";
import { FormProvider, useForms } from "./FormContext";
import { FormOperations } from "./formOperations";
import { DarkModeToggle } from "./DarkModeToggle";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import HowToUsePopup from "./HowToUsePopup"; // Import the new component

const INITIAL_FORM = {
  id: 1, // Use stable ID instead of Date.now()
  ranges: [{ start: 1, end: 1, points: 0 }],
  configName: "",
  pointsPerKill: 0,
  pacifist: "no",
  mostKillsBonus: 0,
  importString: "",
  showImportModal: false,
  text: "",
};
function HomePage() {
  const { forms, setForms, mode, setMode } = useForms();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false); // State to control the popup

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // or a loading placeholder
  }

  const addForm = () => {
    const newForm = {
      ...INITIAL_FORM,
      id: Math.max(...forms.map((f) => f.id), 0) + 1, // Generate stable incremental ID
    };
    setForms([...forms, newForm]);
  };

  const updateForm = (id, field, value) => {
    setForms(
      forms.map((form) => (form.id === id ? { ...form, [field]: value } : form))
    );
  };

  const addRange = (id) => {
    setForms(
      forms.map((form) => {
        if (form.id === id) {
          const lastRange = form.ranges[form.ranges.length - 1];
          return {
            ...form,
            ranges: [
              ...form.ranges,
              { start: lastRange.end + 1, end: lastRange.end + 1, points: 0 },
            ],
          };
        }
        return form;
      })
    );
  };

  const removeRange = (id, index) => {
    setForms(
      forms.map((form) => {
        if (form.id === id) {
          const newRanges = form.ranges.filter((_, i) => i !== index);
          // Only adjust previous range if we have both ranges to work with
          if (index > 0 && newRanges[index] && newRanges[index - 1]) {
            newRanges[index - 1].end = newRanges[index].start - 1;
          }
          return { ...form, ranges: newRanges };
        }
        return form;
      })
    );
  };

  const updateRange = (id, index, field, value) => {
    setForms(
      forms.map((form) => {
        if (form.id === id) {
          const newRanges = form.ranges.map((range, i) => {
            if (i === index) {
              const updatedRange = { ...range, [field]: value };

              if (field === "start") {
                if (index === 0) {
                  updatedRange.start = 1;
                }
                if (
                  index > 0 &&
                  updatedRange.start <= form.ranges[index - 1].start
                ) {
                  updatedRange.start = form.ranges[index - 1].start + 1;
                }
                if (
                  index < form.ranges.length - 1 &&
                  updatedRange.start >= form.ranges[index + 1].start
                ) {
                  updatedRange.start = form.ranges[index + 1].start - 1;
                }
                if (updatedRange.start > updatedRange.end) {
                  updatedRange.end = updatedRange.start;
                }
              }

              if (field === "end" && index === form.ranges.length - 1) {
                if (updatedRange.end < updatedRange.start) {
                  updatedRange.end = updatedRange.start;
                }
              }

              return updatedRange;
            }
            return range;
          });

          for (let i = 0; i < newRanges.length - 1; i++) {
            newRanges[i].end = newRanges[i + 1].start - 1;
          }

          if (form.configName !== "Points") {
            newRanges[newRanges.length - 1].end = Math.min(
              newRanges[newRanges.length - 1].end,
              64
            );
          }

          return { ...form, ranges: newRanges };
        }
        return form;
      })
    );
  };

  const exportConfig = (id) => {
    const form = forms.find((form) => form.id === id);
    const config = {
      configName: form.configName,
      mode: mode,
      pointsPerKill: form.pointsPerKill,
      ranges: form.ranges,
      pacifist: form.pacifist,
      mostKillsBonus: form.mostKillsBonus,
    };
    const encodedConfig = btoa(JSON.stringify(config));
    navigator.clipboard.writeText(encodedConfig);
    alert("Config copied to clipboard!");
  };

  const importConfig = (id) => {
    setForms(
      forms.map((form) => {
        if (form.id === id) {
          try {
            const decodedConfig = JSON.parse(atob(form.importString));
            setMode(decodedConfig.mode);
            return {
              ...form,
              configName: decodedConfig.configName,
              pointsPerKill: decodedConfig.pointsPerKill,
              ranges: decodedConfig.ranges,
              pacifist: decodedConfig.pacifist,
              mostKillsBonus: decodedConfig.mostKillsBonus,
              showImportModal: false,
            };
          } catch (error) {
            alert("Invalid config string");
          }
        }
        return form;
      })
    );
  };

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to clear all data?")) {
      setForms([
        {
          id: 1,
          ranges: [{ start: 1, end: 1, points: 0 }],
          configName: "",
          pointsPerKill: 0,
          pacifist: "no",
          mostKillsBonus: 0,
          importString: "",
          showImportModal: false,
          text: "",
        },
      ]);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center pt-8 ${
        theme === "dark" ? "bg-gray-800" : "bg-white"
      }`}
    >
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
      <h1
        className={`text-4xl font-bold mb-8 ${
          theme === "dark" ? "text-white" : "text-gray-900"
        }`}
      >
        SAR Tourney Scorer
      </h1>
      <div className="flex items-center space-x-4 mb-4">
        <label
          className={`block text-sm font-medium ${
            theme === "dark" ? "text-gray-200" : "text-gray-900"
          }`}
        >
          Solo, Duo, or Squad
        </label>
        <select
          className={`p-2 border rounded ${
            theme === "dark"
              ? "bg-gray-700 text-gray-200 border-gray-600"
              : "bg-white text-gray-900 border-gray-300"
          }`}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="solo">Solo</option>
          <option value="duo">Duo</option>
          <option value="squad">Squad</option>
        </select>
      </div>
      <div className="flex space-x-4 mb-4">
        <button
          type="button"
          className={`p-2 rounded ${
            theme === "dark"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
          onClick={() => setShowHowToUse(true)} // Show the popup
        >
          How to use
        </button>
        <button
          type="button"
          className={`p-2 rounded ${
            theme === "dark"
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-green-500 text-white hover:bg-green-600"
          }`}
          onClick={addForm}
        >
          Add Page
        </button>
        <button
          type="button"
          className={`p-2 rounded ${
            theme === "dark"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
          onClick={clearAllData}
        >
          Clear All Data
        </button>
      </div>
      {forms.map((form) => (
        <div key={form.id} className="flex w-full max-w-4xl mb-8">
          <div className="w-1/2 p-4">
            <textarea
              className={`w-full h-full p-2 border rounded ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-200 border-gray-600"
                  : "bg-white text-gray-900 border-gray-300"
              }`}
              placeholder="Enter /getplayers output here..."
              value={form.text}
              onChange={(e) => updateForm(form.id, "text", e.target.value)}
            ></textarea>
          </div>
          <div className="w-1/2 p-4">
            <form className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  Config Name
                </label>
                <input
                  type="text"
                  className={`w-full p-2 border rounded ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-200 border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  placeholder="Config Name"
                  value={form.configName}
                  onChange={(e) =>
                    updateForm(form.id, "configName", e.target.value)
                  }
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  Points per Kill
                </label>
                <input
                  type="number"
                  className={`w-full p-2 border rounded ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-200 border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  placeholder="Points per Kill"
                  value={form.pointsPerKill}
                  onChange={(e) =>
                    updateForm(
                      form.id,
                      "pointsPerKill",
                      parseInt(e.target.value)
                    )
                  }
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  Points per Placement
                </label>
                <div className="flex w-full space-x-2">
                  <div className="w-[25%] text-left">
                    <label
                      className={`block text-sm font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      From
                    </label>
                  </div>
                  <div className="w-[2%]" /> {/* Spacer for the "-" symbol */}
                  <div className="w-[25%] text-left">
                    <label
                      className={`block text-sm font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      To
                    </label>
                  </div>
                  <div className="w-[25%] text-left">
                    <label
                      className={`block text-sm font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      Points
                    </label>
                  </div>
                  <div className="w-[25%]" />{" "}
                  {/* Spacer for Remove button column */}
                </div>
                {form.ranges.map((range, index) => (
                  <div
                    key={index}
                    className="flex space-x-2 items-center w-full"
                  >
                    <input
                      type="number"
                      className={`w-[25%] p-2 border rounded ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-200 border-gray-600"
                          : "bg-white text-gray-900 border-gray-300"
                      }`}
                      placeholder="Start"
                      value={range.start}
                      onChange={(e) =>
                        updateRange(
                          form.id,
                          index,
                          "start",
                          parseInt(e.target.value)
                        )
                      }
                      min="1"
                      max="64"
                      disabled={index === 0}
                    />
                    <span
                      className={`${
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      -
                    </span>
                    <input
                      type="number"
                      className={`w-[25%] p-2 border rounded ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-200 border-gray-600"
                          : "bg-white text-gray-900 border-gray-300"
                      }`}
                      placeholder="End"
                      value={range.end}
                      onChange={(e) =>
                        updateRange(
                          form.id,
                          index,
                          "end",
                          parseInt(e.target.value)
                        )
                      }
                      min="1"
                      max="64"
                      readOnly={index !== form.ranges.length - 1}
                    />
                    <input
                      type="number"
                      className={`w-[25%] p-2 border rounded ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-200 border-gray-600"
                          : "bg-white text-gray-900 border-gray-300"
                      }`}
                      placeholder="Points"
                      value={range.points}
                      onChange={(e) =>
                        updateRange(
                          form.id,
                          index,
                          "points",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <button
                      type="button"
                      className={`w-[25%] p-2 rounded ${
                        theme === "dark"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-red-500 text-white hover:bg-red-600"
                      } ${index === 0 ? "invisible" : "visible"}`}
                      onClick={() => removeRange(form.id, index)}
                      disabled={form.ranges.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className={`mt-2 p-2 rounded ${
                      theme === "dark"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    onClick={() => addRange(form.id)}
                    disabled={
                      form.configName !== "Points" &&
                      form.ranges[form.ranges.length - 1].end === 64
                    }
                  >
                    Add Range
                  </button>
                  {form.configName !== "Points" &&
                    form.ranges[form.ranges.length - 1].end === 64 && (
                      <p
                        className={`text-red-500 mt-2 ${
                          theme === "dark" ? "text-red-400" : "text-red-500"
                        }`}
                      >
                        Max range of 64 reached.
                      </p>
                    )}
                </div>
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  Pacifist Round
                </label>
                <div className="flex space-x-2">
                  <label
                    className={`flex items-center ${
                      theme === "dark" ? "text-gray-200" : "text-gray-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`pacifist-${form.id}`}
                      value="yes"
                      className={`mr-2 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      }`}
                      checked={form.pacifist === "yes"}
                      onChange={() => updateForm(form.id, "pacifist", "yes")}
                    />
                    Yes
                  </label>
                  <label
                    className={`flex items-center ${
                      theme === "dark" ? "text-gray-200" : "text-gray-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`pacifist-${form.id}`}
                      value="no"
                      className={`mr-2 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      }`}
                      checked={form.pacifist === "no"}
                      onChange={() => updateForm(form.id, "pacifist", "no")}
                    />
                    No
                  </label>
                </div>
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  Most Kills Bonus
                </label>
                <input
                  type="number"
                  className={`w-full p-2 border rounded ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-200 border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  placeholder="Most Kills Bonus"
                  value={form.mostKillsBonus}
                  onChange={(e) =>
                    updateForm(
                      form.id,
                      "mostKillsBonus",
                      parseInt(e.target.value)
                    )
                  }
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className={`mt-2 p-2 rounded ${
                    theme === "dark"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                  onClick={() => exportConfig(form.id)}
                >
                  Export Config
                </button>
                <button
                  type="button"
                  className={`mt-2 p-2 rounded ${
                    theme === "dark"
                      ? "bg-yellow-600 text-white hover:bg-yellow-700"
                      : "bg-yellow-500 text-white hover:bg-yellow-600"
                  }`}
                  onClick={() => updateForm(form.id, "showImportModal", true)}
                >
                  Import Config
                </button>
              </div>
            </form>
          </div>

          {form.showImportModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div
                className={`bg-white p-4 rounded ${
                  theme === "dark"
                    ? "bg-gray-700 text-gray-200"
                    : "bg-white text-gray-900"
                }`}
              >
                <h2
                  className={`text-xl font-bold mb-4 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  Import Config
                </h2>
                <textarea
                  className={`w-full p-2 border rounded mb-4 ${
                    theme === "dark"
                      ? "bg-gray-600 text-gray-200 border-gray-500"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  placeholder="Paste config string here..."
                  value={form.importString}
                  onChange={(e) =>
                    updateForm(form.id, "importString", e.target.value)
                  }
                ></textarea>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className={`p-2 rounded ${
                      theme === "dark"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    onClick={() => importConfig(form.id)}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className={`p-2 rounded ${
                      theme === "dark"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                    onClick={() =>
                      updateForm(form.id, "showImportModal", false)
                    }
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      {showHowToUse && (
        <HowToUsePopup
          theme={theme}
          onClose={() => setShowHowToUse(false)} // Close the popup
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <FormProvider>
      <div className="flex flex-col">
        <HomePage />
        <FormOperations />
      </div>
    </FormProvider>
  );
}
