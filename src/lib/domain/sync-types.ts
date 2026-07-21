export type TabSyncStatus = {
  tabName: string;
  status: "imported" | "skipped" | "failed";
  rowCount: number;
  errorCount: number;
  message?: string;
};

export type SheetSyncResult = {
  spreadsheetId: string;
  tabs: TabSyncStatus[];
  totalImported: number;
  totalSkipped: number;
  totalFailed: number;
};
