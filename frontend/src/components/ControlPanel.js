import React, { useContext, useEffect, useState } from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
import ErrorViewer from './ErrorViewer';
import ContactsPanel from './ContactsPanel';
import FaqSection from './FaqSection';
import MinimalButton from './MinimalButton';
import ProfilePanel from './ProfilePanel';
import GroupsPanel from './GroupsPanel';
import panelIcon from '../assets/panel.svg';
import faqIcon from '../assets/faq.svg';
import settingsIcon from '../assets/settings.svg';
import statusIcon from '../assets/status.svg';
import logIcon from '../assets/log.svg';
import errorIcon from '../assets/error.svg';
import contactsIcon from '../assets/contacts.svg';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

export default function ControlPanel(){
  const { setDialogs } = useContext(AppContext);
  const [mainTab, setMainTab] = useState('panel');
  const [subTab, setSubTab] = useState('profile');

  useEffect(() => {
    fetchDialogs()
      .then(d => {
        if (Array.isArray(d)) {
          setDialogs(d);
        }
      })
      .catch(err => window.alert(err.message || 'Diyaloglar alınamadı'));
  }, [setDialogs]);

  return (
    <div className="container-fluid">
      <div className="page-header">
        <h1 className="page-title">Telegram Arşivleyici — Kontrol Paneli</h1>
        <div className="page-description">Telegram hesabınızı yönetin ve medya dosyalarınızı indirin</div>
      </div>

      <div className="tabs-container mb-4">
        <button
          className={`tab ${mainTab === 'panel' ? 'active' : ''}`}
          onClick={() => setMainTab('panel')}
        >
          <img src={panelIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
          Kontrol Paneli
        </button>
        <button
          className={`tab ${mainTab === 'faq' ? 'active' : ''}`}
          onClick={() => setMainTab('faq')}
        >
          <img src={faqIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
          SSS
        </button>
      </div>

      {mainTab === 'panel' ? (
        <>
          <div className="tabs-container mb-4">
            <button
              className={`tab ${subTab === 'profile' ? 'active' : ''}`}
              onClick={() => setSubTab('profile')}
            >
              <img src={panelIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
              Profil
            </button>
            <button
              className={`tab ${subTab === 'groups' ? 'active' : ''}`}
              onClick={() => setSubTab('groups')}
            >
              <img src={contactsIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
              Gruplar
            </button>
            <button
              className={`tab ${subTab === 'settings' ? 'active' : ''}`}
              onClick={() => setSubTab('settings')}
            >
              <img src={settingsIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
              Ayarlar
            </button>
            <button
              className={`tab ${subTab === 'status' ? 'active' : ''}`}
              onClick={() => setSubTab('status')}
            >
              <img src={statusIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
              Durum
            </button>
            <button
              className={`tab ${subTab === 'log' ? 'active' : ''}`}
              onClick={() => setSubTab('log')}
            >
              <img src={logIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
              Loglar
            </button>
            <button
              className={`tab ${subTab === 'errors' ? 'active' : ''}`}
              onClick={() => setSubTab('errors')}
            >
              <img src={errorIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
              Hatalar
            </button>
            <button
              className={`tab ${subTab === 'contacts' ? 'active' : ''}`}
              onClick={() => setSubTab('contacts')}
            >
              <img src={contactsIcon} alt="" width="16" height="16" style={{ marginRight: '8px' }} />
              Kişiler
            </button>
          </div>

          <div className="animate-fadeIn">
            {subTab === 'profile' && <ProfilePanel />}
            {subTab === 'groups' && <GroupsPanel />}
            {subTab === 'settings' && <SettingsForm />}
            {subTab === 'status' && <StatusPanel />}
            {subTab === 'log' && <LogViewer />}
            {subTab === 'errors' && <ErrorViewer />}
            {subTab === 'contacts' && <ContactsPanel />}
          </div>
        </>
      ) : (
        <div className="animate-fadeIn">
          <FaqSection />
        </div>
      )}
    </div>
  );
}
