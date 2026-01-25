import styles from "./ratings.module.css"

const Ratings = (props: { name: string; value: number }) => {
  const { name, value } = props
  const stars = []

  for (let index = 1; index <= value; index++) {
    stars.push(<i key={`filled-${index}`} className={`fa fa-star ${styles.ratingColor}`} />)
  }
  for (let index = value + 1; index <= 5; index++) {
    stars.push(<i key={`empty-${index}`} className="fa fa-star" />)
  }

  return (
    <div className={styles.ratingRow}>
      <span>{name}</span>
      <div className={styles.smallRatings}>{stars}</div>
    </div>
  )
}

export default Ratings
