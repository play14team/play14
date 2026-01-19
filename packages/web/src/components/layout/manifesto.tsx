interface ManifestoProps {
  showCard?: boolean
}

const Manifesto = ({ showCard = true }: ManifestoProps) => {
  const wrapperClass = showCard ? "single-funfacts-box values-card" : "values-content"

  return (
    <div className={wrapperClass}>
      {showCard ? (
        <div className="icon">
          <i className="bx bx-book-heart orange" />
        </div>
      ) : (
        <div className="values-header">
          <i className="bx bx-book-heart orange" />
          <h3>Manifesto</h3>
        </div>
      )}
      {showCard && <h3>Manifesto</h3>}
      <p>
        <strong>#play14</strong> is and always will be
      </p>
      <ul>
        <li>
          <i className="bx bx-share-alt blue" />
          <span>
            a place to <strong>share knowledge &amp; practices</strong> more than a place to sell
            services &amp; goods
          </span>
        </li>
        <li>
          <i className="bx bx-door-open green" />
          <span>
            <strong>open to all people or communities</strong> with an interest on learning with fun
          </span>
        </li>
        <li>
          <i className="bx bx-world orange" />
          <span>
            focused on <strong>games &amp; activities in the physical world</strong> more than in
            the virtual world
          </span>
        </li>
        <li>
          <i className="bx bx-conversation blue" />
          <span>
            <strong>an unconference</strong> based on the Open Space Technology
          </span>
        </li>
        <li>
          <i className="bx bx-heart green" />
          <span>
            <strong>non profit</strong>, which means that when we do make a profit on a given event,
            we reinvest everything into the next
          </span>
        </li>
      </ul>
    </div>
  )
}

export default Manifesto
