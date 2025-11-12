
import { CsvGuest } from '../types';

export const parseCsvToJson = (csvText: string): Promise<CsvGuest[]> => {
  return new Promise((resolve, reject) => {
    try {
      const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        reject(new Error("CSV must have a header row and at least one data row."));
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const requiredHeaders = ["guest_code", "full_name", "email", "phone", "language", "invited_to_ceremony", "max_accomp", "relationship", "side"];
      
      for(const requiredHeader of requiredHeaders) {
          if(!headers.includes(requiredHeader)) {
              reject(new Error(`Missing required CSV header: ${requiredHeader}`));
              return;
          }
      }

      const jsonResult: CsvGuest[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
          let value: any = values[j] ? values[j].trim() : '';
          const header = headers[j];

          if (header === 'invited_to_ceremony') {
            value = value.toLowerCase() === 'true';
          } else if (header === 'max_accomp') {
            value = parseInt(value, 10);
            if (isNaN(value)) value = 0;
          }

          obj[header] = value;
        }
        jsonResult.push(obj as CsvGuest);
      }
      resolve(jsonResult);
    } catch (error) {
      reject(error);
    }
  });
};
