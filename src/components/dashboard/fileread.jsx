import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

function EnhancedCSVReader() {
  const [autoLoadedData, setAutoLoadedData] = useState([]);
  const [userSelectedData, setUserSelectedData] = useState([]);

  // 1. Autoload CSV from 'public' folder on component mount
  useEffect(() => {
    const csvFileURL = '/example.csv'; // place your CSV file in /public folder
    fetch(csvFileURL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load CSV from ${csvFileURL}`);
        }
        return response.text();
      })
      .then((csvText) => {
        const parsed = Papa.parse(csvText, {
          header: true,       // set to false if CSV doesn't have headers
          skipEmptyLines: true
        });
        setAutoLoadedData(parsed.data);
      })
      .catch((error) => {
        console.error('Error fetching CSV from public folder:', error);
      });
  }, []);

  // 2. Let user select a file from their local drive
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true, // or false depending on your CSV format
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Parsed CSV (user-selected):', results.data);
        setUserSelectedData(results.data);
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
      }
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Enhanced CSV Reader</h2>

      {/* Part 1: Auto-loaded CSV from /public/example.csv */}
      <div style={{ marginBottom: 20 }}>
        <h4>Data auto-loaded from /public/example.csv</h4>
        <pre>{JSON.stringify(autoLoadedData, null, 2)}</pre>
      </div>

      {/* Part 2: User-selected CSV file input */}
      <div style={{ marginBottom: 20 }}>
        <h4>Choose a CSV from your local drive</h4>
        <input type="file" accept=".csv" onChange={handleFileUpload} />
        <pre>{JSON.stringify(userSelectedData, null, 2)}</pre>
      </div>
    </div>
  );
}

export default EnhancedCSVReader;