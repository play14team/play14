import { format, parseISO } from "date-fns"
import Image from "next/image"
import { Enum_Componentdefaulthistoryitem_Dateformat } from "@/models/strapi"

interface HistoryProps {
  date: Date | string
  dateFormat: Enum_Componentdefaulthistoryitem_Dateformat
  additionalText: string
  title: string
  image?: string
  imageAlt?: string
  children: React.ReactNode
}

const HistoryItem = (props: HistoryProps) => {
  const { date, dateFormat, additionalText, title, image, imageAlt, children } = props

  const dateFormatPattern = getFormat(dateFormat)
  const dateValue = typeof date === "string" ? parseISO(date) : date

  return (
    <li className="timeline-block">
      <div className="timeline-date">
        <span>{format(dateValue, "yyyy")}</span>
        {dateFormatPattern && format(dateValue, dateFormatPattern)}
        {additionalText}
      </div>

      <div className="timeline-icon">
        <span className="dot-badge" />
      </div>

      <div className="timeline-content">
        <div className="row align-items-center">
          <div className="col-lg-7 col-md-12">
            <div className="content">
              <h3>{title}</h3>
              {children}
            </div>
          </div>

          {image && (
            <div className="col-lg-5 col-md-12">
              <div className="image">
                <Image
                  src={image}
                  alt={imageAlt || "image"}
                  width={250}
                  height={250}
                  unoptimized
                  className="shadow"
                  style={{
                    borderRadius: "10px",
                    height: "auto",
                    maxWidth: "100%",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

const getFormat = (dateFormat: Enum_Componentdefaulthistoryitem_Dateformat) => {
  switch (dateFormat) {
    case Enum_Componentdefaulthistoryitem_Dateformat.Day:
      return "MMMM do"
    case Enum_Componentdefaulthistoryitem_Dateformat.Month:
      return "MMMM"
    default:
      return undefined
  }
}

export default HistoryItem
