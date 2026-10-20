npm install --no-save papaparse@5.7.0 @types/papaparse@5.5.2 https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

- papaparse@5.7.0 parses and writes CSV in the browser and in Vitest.
- @types/papaparse@5.5.2 provides the types. papaparse 5.7.0 does not ship its own.
- The SheetJS tarball is xlsx 0.20.3 from cdn.sheetjs.com. It reads xlsx and xls. PLAN says not to use the frozen npm xlsx 0.18.5 package.
