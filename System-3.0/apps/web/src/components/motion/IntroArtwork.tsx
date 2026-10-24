export function IntroArtwork() {
  return (
    <div className="intro-sheet" data-intro-sheet="">
      <div className="intro-topline" aria-hidden="true">
        <span>{"FINE FORM / CAR CARE"}</span>
        <span>{"UM VEÍCULO POR VEZ."}</span>
      </div>
      <div className="intro-center" data-intro-center="">
        <div className="intro-orbit" aria-hidden="true">
          <svg viewBox="0 0 120 120" focusable="false">
            <circle
              className="intro-orbit-track"
              cx="60"
              cy="60"
              r="48"
            ></circle>
            <g className="intro-orbit-turn">
              <path d="M60 12A48 48 0 0 1 108 60"></path>
              <circle cx="108" cy="60" r="8"></circle>
              <circle cx="12" cy="60" r="5"></circle>
            </g>
          </svg>
          <img src="/assets/logo-original.png" alt="" width="44" height="44" />
        </div>
        <p className="intro-wordmark">
          {"FINE FORM"}
          <span className="intro-wordmark-dot" aria-hidden="true"></span>
        </p>
        <p className="intro-tagline">{"Seu veículo, em boa forma."}</p>
        <div className="intro-loader-track" aria-hidden="true">
          <span></span>
        </div>
        <p
          className="intro-status"
          data-intro-status=""
          role="status"
          aria-live="polite"
        >
          <span data-intro-label="">{"Preparando cada detalhe"}</span>
          <span className="intro-loading-dots" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </span>
        </p>
      </div>
      <div className="intro-fold" aria-hidden="true"></div>
      <div className="intro-tentacle" data-intro-tentacle="">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="intro-tentacle-art"
          viewBox="0 0 900 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="ff-arm-cyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#78d3c3"></stop>
              <stop offset=".5" stopColor="#53c3b1"></stop>
              <stop offset="1" stopColor="#388a7d"></stop>
            </linearGradient>
            <linearGradient id="ff-arm-tip" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#83d9c9"></stop>
              <stop offset=".6" stopColor="#53c3b1"></stop>
              <stop offset="1" stopColor="#3d9d8d"></stop>
            </linearGradient>
          </defs>
          <g
            className="intro-arm-body"
            stroke="#0b0d0c"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              data-arm-base=""
              d="M310 260C322 265 333 269 346 275C438 317 528 299 635 308C733 317 825 335 950 327L950 428C750 389 568 382 387 355C347 349 312 338 280 320"
              fill="url(#ff-arm-cyan)"
              strokeWidth="7"
            ></path>
            <path
              data-arm-shade=""
              d="M298 288C402 356 575 336 699 353C785 364 865 366 950 364L950 428C750 389 568 382 387 355C337 348 289 330 255 307Z"
              fill="#388a7d"
              stroke="none"
              opacity=".45"
            ></path>
            <path
              data-arm-highlight=""
              d="M364 292C446 326 535 312 625 323C738 337 823 347 916 344"
              fill="none"
              stroke="#bde8e1"
              strokeWidth="9"
              opacity=".55"
            ></path>
            <g data-intro-tail-cups="">
              <g className="intro-arm-cups" fill="#bde8e1" strokeWidth="3">
                <ellipse
                  cx="327"
                  cy="315"
                  rx="17"
                  ry="10"
                  transform="rotate(22 327 315)"
                ></ellipse>
                <ellipse
                  cx="392"
                  cy="338"
                  rx="19"
                  ry="11"
                  transform="rotate(12 392 338)"
                ></ellipse>
                <ellipse
                  cx="466"
                  cy="351"
                  rx="21"
                  ry="12"
                  transform="rotate(7 466 351)"
                ></ellipse>
                <ellipse
                  cx="548"
                  cy="362"
                  rx="23"
                  ry="13"
                  transform="rotate(5 548 362)"
                ></ellipse>
                <ellipse
                  cx="639"
                  cy="371"
                  rx="25"
                  ry="14"
                  transform="rotate(4 639 371)"
                ></ellipse>
                <ellipse
                  cx="739"
                  cy="380"
                  rx="27"
                  ry="15"
                  transform="rotate(4 739 380)"
                ></ellipse>
                <ellipse
                  cx="848"
                  cy="388"
                  rx="29"
                  ry="16"
                  transform="rotate(3 848 388)"
                ></ellipse>
              </g>
              <g fill="#388a7d" stroke="none" opacity=".7">
                <ellipse
                  cx="327"
                  cy="316"
                  rx="7"
                  ry="4"
                  transform="rotate(22 327 316)"
                ></ellipse>
                <ellipse
                  cx="392"
                  cy="339"
                  rx="8"
                  ry="5"
                  transform="rotate(12 392 339)"
                ></ellipse>
                <ellipse cx="466" cy="352" rx="9" ry="5"></ellipse>
                <ellipse cx="548" cy="363" rx="10" ry="6"></ellipse>
                <ellipse cx="639" cy="372" rx="11" ry="6"></ellipse>
                <ellipse cx="739" cy="381" rx="12" ry="7"></ellipse>
                <ellipse cx="848" cy="389" rx="13" ry="7"></ellipse>
              </g>
            </g>
          </g>
          <g
            className="intro-arm-tip"
            stroke="#0b0d0c"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M316 261C250 234 197 202 174 162C155 129 160 93 186 80C207 69 231 77 237 94C244 112 229 128 214 122C224 141 252 139 268 116C291 82 270 36 230 25C181 11 131 38 115 83C90 152 128 224 183 270C212 294 250 313 283 321"
              fill="url(#ff-arm-tip)"
              strokeWidth="7"
            ></path>
            <path
              d="M288 291C248 277 222 261 200 243C164 213 145 172 150 132C154 102 169 81 190 73"
              fill="none"
              stroke="#bde8e1"
              strokeWidth="8"
              opacity=".55"
            ></path>
            <g fill="#bde8e1" strokeWidth="2.8">
              <ellipse
                cx="133"
                cy="132"
                rx="8"
                ry="12"
                transform="rotate(-8 133 132)"
              ></ellipse>
              <ellipse
                cx="143"
                cy="179"
                rx="10"
                ry="14"
                transform="rotate(-25 143 179)"
              ></ellipse>
              <ellipse
                cx="170"
                cy="221"
                rx="12"
                ry="16"
                transform="rotate(-39 170 221)"
              ></ellipse>
              <ellipse
                cx="208"
                cy="257"
                rx="14"
                ry="17"
                transform="rotate(-48 208 257)"
              ></ellipse>
              <ellipse
                cx="252"
                cy="285"
                rx="16"
                ry="18"
                transform="rotate(-59 252 285)"
              ></ellipse>
            </g>
            <g fill="#388a7d" stroke="none">
              <ellipse
                cx="133"
                cy="133"
                rx="3"
                ry="5"
                transform="rotate(-8 133 133)"
              ></ellipse>
              <ellipse
                cx="143"
                cy="180"
                rx="4"
                ry="6"
                transform="rotate(-25 143 180)"
              ></ellipse>
              <ellipse
                cx="170"
                cy="222"
                rx="5"
                ry="7"
                transform="rotate(-39 170 222)"
              ></ellipse>
              <ellipse
                cx="208"
                cy="258"
                rx="6"
                ry="7"
                transform="rotate(-48 208 258)"
              ></ellipse>
              <ellipse
                cx="252"
                cy="286"
                rx="7"
                ry="8"
                transform="rotate(-59 252 286)"
              ></ellipse>
            </g>
          </g>
        </svg>
      </div>
      <div className="intro-grip-spark" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p className="intro-footnote">{"ATENÇÃO EM CADA ETAPA."}</p>
    </div>
  );
}
