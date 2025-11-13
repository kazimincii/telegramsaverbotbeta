import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Panel from './Panel';
import MinimalButton from './MinimalButton';
import playIcon from '../assets/play.svg';
import stopIcon from '../assets/stop.svg';
import testIcon from '../assets/test.svg';

export default function StatusPanel(){
  const { running, progress, start, stop, cfg } = useContext(AppContext);
  const valid = cfg.api_id && cfg.api_hash && cfg.out;
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Sistem Durumu</h3>
      </div>
      <div className="card-body">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'var(--spacing-md)'}}>
          <div className={`badge ${running ? 'badge-success' : 'badge-secondary'}`}>
            <span className="status-indicator" style={{background: running ? 'var(--success)' : 'var(--text-muted)'}}></span>
            {running ? "Çalışıyor" : "Beklemede"}
          </div>
          <div style={{display:'flex',gap:'var(--spacing-sm)'}}>
            <button className="btn btn-secondary" onClick={async ()=>{ try{ await stop(); } catch(e){} }}>
              <img src={stopIcon} alt="" width="16" height="16" style={{marginRight:'6px'}} />
              Durdur
            </button>
            <button
              className="btn btn-primary"
              onClick={async ()=>{ try{ await start(false); } catch(e){} }}
              disabled={!valid}
            >
              <img src={playIcon} alt="" width="16" height="16" style={{marginRight:'6px'}} />
              Başlat
            </button>
            <button className="btn btn-secondary" onClick={async ()=>{ try{ await start(true); } catch(e){} }}>
              <img src={testIcon} alt="" width="16" height="16" style={{marginRight:'6px'}} />
              Dry-Run
            </button>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Çalışma</div>
            <div className="stat-value">{running ? "Evet" : "Hayır"}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Sohbet</div>
            <div className="stat-value">{progress?.chat || "-"}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">İndirilen</div>
            <div className="stat-value text-success">{progress?.downloaded ?? 0}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Atlanan</div>
            <div className="stat-value text-muted">{progress?.skipped ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
