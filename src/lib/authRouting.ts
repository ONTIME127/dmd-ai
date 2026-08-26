export type AccountType = "family" | "hospital_applicant" | "hospital_member" | "admin";

export function routeForAccountType(accountType: string | null | undefined) {
  switch (accountType) {
    case "admin":
      return "/admin";
    case "hospital_member":
      return "/clinical";
    case "hospital_applicant":
      return "/hospital-application";
    case "family":
      return "/family";
    default:
      return "/login";
  }
}

export function isAccountType(value: unknown): value is AccountType {
  return value === "family" || value === "hospital_applicant" || value === "hospital_member" || value === "admin";
}
