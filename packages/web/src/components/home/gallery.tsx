import { getHome } from "./get.action"
import Gallery from "../layout/gallery"

const HomeGallery = async () => {
  const home = await getHome()
  const images = home?.images?.filter((img) => img != null)

  return <div className="container">{images && <Gallery images={images} />}</div>
}

export default HomeGallery
