import mark from '../../assets/loading-mark.png';
import ghost from '../../assets/loading-ghost.png';
import wordmark from '../../assets/loading-wordmark.png';
import './KookaSplash.css';

const maskStyle = {
  WebkitMaskImage: `url(${mark})`,
  maskImage: `url(${mark})`,
};

/**
 * Full-screen KOOKA loading splash — the "1a · gold fill" animation
 * (mark pours in + shine), without the progress bar or status text.
 * Pass `hide` to fade it out before it unmounts.
 */
export default function KookaSplash({ hide = false }) {
  return (
    <div
      className={`kl-splash${hide ? ' kl-splash--hide' : ''}`}
      role="status"
      aria-label="Se încarcă"
      aria-hidden={hide}
    >
      <div className="kl-splash__inner">
        <div className="kl-mark">
          <img className="kl-ghost" src={ghost} alt="" />
          <img className="kl-fill" src={mark} alt="" />
          <div className="kl-shine-clip" style={maskStyle}>
            <div className="kl-shine" />
          </div>
        </div>
        <img className="kl-word" src={wordmark} alt="KOOKA" />
      </div>
    </div>
  );
}
