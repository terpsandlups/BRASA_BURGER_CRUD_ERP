export class Falha extends Error {
  constructor(status, message) { super(message); this.status = status }
}
