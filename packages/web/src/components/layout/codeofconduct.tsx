interface CodeOfConductProps {
  showCard?: boolean
}

const CodeOfConduct = ({ showCard = true }: CodeOfConductProps) => {
  const wrapperClass = showCard ? "single-funfacts-box values-card" : "values-content"

  return (
    <div className={wrapperClass}>
      {showCard ? (
        <div className="icon">
          <i className="bx bx-shield-quarter blue" />
        </div>
      ) : (
        <div className="values-header">
          <i className="bx bx-shield-quarter blue" />
          <h3>Code of Conduct</h3>
        </div>
      )}
      {showCard && <h3>Code of Conduct</h3>}
      <ul>
        <li>
          <i className="bx bx-brain orange" />
          <span>
            You shall be <strong>open minded</strong> and ready to <strong>listen and learn</strong>{" "}
            from others
          </span>
        </li>
        <li>
          <i className="bx bx-bulb green" />
          <span>
            You shall feel free to <strong>propose, experiment and explain</strong> what you have in
            mind
          </span>
        </li>
        <li>
          <i className="bx bx-block blue" />
          <span>
            You shall <strong>not high-jack, sabotage or ruin</strong> the learning experience of
            others
          </span>
        </li>
        <li>
          <i className="bx bx-time orange" />
          <span>
            You shall <strong>manage your own timebox</strong> when facilitating so that other
            sessions can start on time
          </span>
        </li>
        <li>
          <i className="bx bx-user-check green" />
          <span>
            You shall <strong>behave appropriately</strong> and be a{" "}
            <strong>decent human being</strong>
          </span>
        </li>
        <li>
          <i className="bx bx-leaf blue" />
          <span>
            You shall always <strong>leave the playground clean</strong> (boy scout rule),{" "}
            <strong>avoid waste</strong> and try to reduce your <strong>carbon footprint</strong>
          </span>
        </li>
        <li>
          <i className="bx bx-happy-heart-eyes orange" />
          <span>
            You shall be ready to <strong>get serious fun and good laughs</strong> and should try
            not be shy about that
          </span>
        </li>
      </ul>
      <p className={showCard ? "pt-3" : "values-summary"}>
        To summarize: &ldquo;You shall not be an a**hole&rdquo;.
      </p>
    </div>
  )
}

export default CodeOfConduct
