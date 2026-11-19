export function missingColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    Boolean(error?.message?.toLowerCase().includes("column"))
  );
}
export function missingFunction(error: { code?: string } | null) {
  return error?.code === "PGRST202" || error?.code === "42883";
}
