// Guards against storing a javascript:/data: URL that a later `<a href>`
// would execute when clicked — only http(s) links are ever saved.
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
