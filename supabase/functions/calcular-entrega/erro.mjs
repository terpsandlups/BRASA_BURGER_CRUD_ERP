export class Falha extends Error {
  constructor(status, message, detalhes = {}) { super(message); this.status = status; this.detalhes = detalhes }
}
