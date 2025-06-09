// Export type definitions that can be imported instead of using global declarations

export interface MonacoTheme {
    base: string;
    inherit: boolean;
    rules: Array<{
        token: string;
        foreground?: string;
        background?: string;
        fontStyle?: string;
    }>;
    colors: Record<string, string>;
}

export interface MonacoModel {
    getValue: () => string;
    setValue: (value: string) => void;
    getLanguageId: () => string;
}

export interface MonacoMarker {
    severity: number;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    message: string;
}

export interface MonacoEditor {
    getValue: () => string;
    setValue: (value: string) => void;
    getModel: () => MonacoModel | null;
    focus: () => void;
}

export interface MonacoType {
    editor: {
        defineTheme: (name: string, theme: MonacoTheme) => void;
        setTheme: (theme: string) => void;
        setModelMarkers: (model: MonacoModel, owner: string, markers: MonacoMarker[]) => void;
        getEditors?: () => MonacoEditor[];
    };
    KeyMod: Record<string, number>;
    KeyCode: Record<string, number>;
    MarkerSeverity: {
        Error: number;
        Warning: number;
        Info: number;
        Hint: number;
    };
}

// No global declarations
