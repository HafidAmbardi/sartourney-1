"use client";
import { createContext, useContext, useState, useEffect } from "react";

const FormContext = createContext();

export function FormProvider({ children }) {
  const getDefaultFormState = () => [
    {
      id: 1,
      ranges: [{ start: 1, end: 1, points: 0 }],
      configName: "",
      mode: "solo",
      pointsPerKill: 0,
      killCap: 0,
      pacifist: "no",
      mostKillsBonus: 0,
      importString: "",
      showImportModal: false,
      text: "",
    },
  ];

  const [forms, setForms] = useState(getDefaultFormState());
  const [mode, setMode] = useState("solo");

  // Move initialization to useEffect to ensure window is defined
  useEffect(() => {
    const loadSavedForms = () => {
      try {
        const savedForms = localStorage.getItem("tourneyForms");
        if (savedForms) {
          setForms(JSON.parse(savedForms));
        }
      } catch (error) {
        console.error("Error loading saved forms", error);
      }
    };

    loadSavedForms();
  }, []);

  // Save forms when they change
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("tourneyForms", JSON.stringify(forms));
      }
    } catch (error) {
      console.error("Error saving forms to local storage", error);
    }
  }, [forms]);

  return (
    <FormContext.Provider value={{ forms, setForms, mode, setMode }}>
      {children}
    </FormContext.Provider>
  );
}

export function useForms() {
  return useContext(FormContext);
}
