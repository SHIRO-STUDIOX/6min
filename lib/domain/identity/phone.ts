export function normalizePhone(input: string): string {
  let phone = input
    .normalize("NFKC")
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[\s()\-]/g, "");
  if (/^09\d{9}$/.test(phone)) phone = "+98" + phone.slice(1);
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("INVALID_PHONE");
  return phone;
}
