export function isBirthdayToday(dateOfBirth?: string): boolean {
  if (!dateOfBirth) return false;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return false;

  const today = new Date();
  return (
    birthDate.getMonth() === today.getMonth() &&
    birthDate.getDate() === today.getDate()
  );
}

export function getBirthdayGreetingStorageKey(userId: string): string {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  return `birthday-greeting-shown-${userId}-${dateKey}`;
}
