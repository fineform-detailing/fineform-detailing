export function VehicleIcon({ vehicle }: { vehicle: "car" | "moto" }) {
  return (
    <svg viewBox="0 0 100 50" aria-hidden="true">
      {vehicle === "car" ? (
        <>
          <path d="M9 32 13 22 26 18 37 9 64 9 80 20 91 24 93 36H8Z M28 18H76 M39 10 34 18 M61 10 67 18 M12 25H23 M83 27H91" />
          <circle cx="27" cy="36" r="8" />
          <circle cx="76" cy="36" r="8" />
          <circle cx="27" cy="36" r="3" />
          <circle cx="76" cy="36" r="3" />
        </>
      ) : (
        <>
          <circle cx="23" cy="35" r="11" />
          <circle cx="79" cy="35" r="11" />
          <path d="m23 35 16-22h13l13 8-20 14H23l26-1-10-18 M52 13 61 8 72 8 79 35 M70 8 69 3H60 M28 12h19 M36 18 49 22 64 20" />
        </>
      )}
    </svg>
  );
}
