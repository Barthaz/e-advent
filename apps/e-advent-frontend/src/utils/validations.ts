export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}

export function validateTask(task: string): boolean {
  return task.trim().length > 0 && task.trim().length <= 200;
}

export function validateDay(day: number): boolean {
  return day >= 1 && day <= 24;
}

