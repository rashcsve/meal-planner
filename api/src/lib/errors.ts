export class DuplicateTitleError extends Error {
  constructor(title: string) {
    super(`A recipe titled "${title}" already exists`);
    this.name = "DuplicateTitleError";
  }
}
