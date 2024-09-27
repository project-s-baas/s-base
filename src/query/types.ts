interface Column {
  name: string;
  type: string;
  primary: boolean;
  unique: boolean;
  notnull: boolean;
  default?: string;
  reference?: string;
}

interface Table {
  visible: boolean;
  name: string;
  description: string;
  schema: Column[];
}

export type { Column, Table };