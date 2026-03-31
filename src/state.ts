export interface BuildState {
  isBuilding: boolean;
  percentage: number; // 0–100
  message: string;
  /** currently processed module path (file path from rspack progress args) */
  moduleName: string;
  hasBeenValid: boolean; // true after first successful build
}

export function createBuildState(): BuildState {
  return {
    isBuilding: false,
    percentage: 0,
    message: '',
    moduleName: '',
    hasBeenValid: false,
  };
}
