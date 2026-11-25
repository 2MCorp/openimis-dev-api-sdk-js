export const HF_LEVELS = [
  { value: "C", label: "Health Center" },
  { value: "D", label: "Dispensary" },
  { value: "H", label: "Hospital" },
] as const;

export const HF_CARE_TYPES = [
  { value: "I", label: "In-Patient" },
  { value: "O", label: "Out-Patient" },
  { value: "B", label: "In & Out-Patient" },
] as const;

export const HF_STAFF_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Staff" },
] as const;
