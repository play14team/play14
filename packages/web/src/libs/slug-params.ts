export interface LocaleParamsProps {
  params: Promise<{
    locale: string
  }>
}

export interface SlugParamsProps {
  params: Promise<{
    locale: string
    slug: string
  }>
}
