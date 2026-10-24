// The same formatting rules are used by the form and by the Worker.
export const platePattern = "(?:[A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})";
const canonical = new RegExp("^" + platePattern + "$");
export function normalizePlate(value) {
  if (
    typeof value !== "string" ||
    value.length > 16 ||
    !/^[A-Za-z0-9\s-]*$/.test(value)
  )
    return "";
  return value.replace(/[\s-]/g, "").toUpperCase();
}
export const isPlate = (value) =>
  typeof value === "string" && canonical.test(value);
export const plateLabel = (value) =>
  isPlate(value) ? value : "Placa não cadastrada";
export const registeredPlateLabel = (record) =>
  record?.plateVerified
    ? plateLabel(record.plate)
    : "Aguardando cadastro presencial";
export const plateInputAttrs =
  'required maxlength="8" minlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC1D23 ou ABC-1234" pattern="[A-Za-z]{3}-?[0-9][A-Za-z0-9][0-9]{2}"';
