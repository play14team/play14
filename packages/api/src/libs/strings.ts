import slugify from 'slugify';

export function eventToSlug(name: string, start: string | Date): string {
  const date = new Date(start);
  const month = (date.getMonth() + 1).toString();
  return toSlug(name) + "-" + month.padStart(2, "0");
}

export function toSlug(value: string): string {
  const normalized = normalize(value);
  return slugify(normalized, { remove: /[*+~.,&()'"!:@#?]/g }).toLowerCase();
}

export function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
