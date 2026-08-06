import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Heart, Users, Activity, Wallet } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, Field, SectionLabel, StepProgress, PageLoader, Badge, DisplayItalic } from '../ui.jsx';

const INTERESTS = [
  { id: 'mobilite_douce', label: 'Mobilité Douce' },
  { id: 'habitation',     label: 'Habitation' },
  { id: 'sante',          label: 'Santé & Bien-être' },
  { id: 'voyage',         label: 'Voyage' },
  { id: 'animaux',        label: 'Animaux' },
  { id: 'electronique',   label: 'Électronique' },
];

const ChoiceButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '0.75rem 1rem', background: active ? 'rgba(200,169,110,0.12)' : 'var(--ink-90)',
      border: active ? '1px solid var(--gold-dim)' : '1px solid rgba(240,237,230,0.08)',
      cursor: 'pointer', color: active ? 'var(--gold)' : 'var(--paper-dim)',
      fontFamily: 'var(--font-body)', fontSize: '0.875rem', textAlign: 'left',
      transition: 'all 0.2s', borderRadius: 0,
    }}
  >
    {children}
  </button>
);

export const OnboardingPage = ({ navigate, user, setUser }) => {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tranche_age: '', situation_pro: '',
    interets_assurance: [], budget_max_mensuel: 50,
    situation_familiale: '', nombre_personnes_a_charge: 0,
    couverture_existante: [], priorite_assurance: '',
    niveau_risque: '', region: '',
  });
  const [recommendations, setRecommendations] = useState(null);

  const toggle = (key, val) => setFormData(p => ({
    ...p,
    [key]: p[key].includes(val)
      ? p[key].filter(v => v !== val)
      : [...p[key], val],
  }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.submitOnboarding(formData);
      setUser(p => ({ ...p, onboarding_complete: true }));
      const recs = await api.getRecommendations().catch(() => []);
      setRecommendations(recs);
      setStep(5);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (step === 4 && !formData.region) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
              );
              const data = await res.json();
              if (data && data.address) {
                const region = data.address.state || data.address.region || data.address.province || data.address.city || data.address.town;
                if (region) {
                  setFormData(prev => ({ ...prev, region }));
                }
              }
            } catch (err) {
              console.error("Erreur lors du reverse geocoding:", err);
            }
          },
          (err) => {
            console.warn("Géolocalisation non autorisée ou erreur:", err);
          }
        );
      }
    }
  }, [step]);

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <div className="container-editorial" style={{ maxWidth: '680px' }}>
        <SectionLabel>Bienvenue</SectionLabel>
        <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
          Profil <DisplayItalic>d'assurance</DisplayItalic>
        </h1>
        <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginBottom: '2.5rem' }}>
          Aidez-nous à trouver les meilleurs groupes pour vous grâce à l'IA.
        </p>

        {step < 5 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <StepProgress total={4} current={step} />
            <span className="text-caption">Étape {step} / 4</span>
          </div>
        )}

        <Card gold>
          {/* ── Step 1 ── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Tranche d'âge</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--gold-line)' }}>
                  {['18-25', '26-35', '36-50', '51+'].map(age => (
                    <ChoiceButton key={age} active={formData.tranche_age === age} onClick={() => setFormData({ ...formData, tranche_age: age })}>
                      {age} ans
                    </ChoiceButton>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Situation professionnelle</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--gold-line)' }}>
                  {[
                    { id: 'etudiant', label: 'Étudiant' },
                    { id: 'salarie', label: 'Salarié' },
                    { id: 'independant', label: 'Indépendant' },
                    { id: 'retraite', label: 'Retraité' },
                  ].map(s => (
                    <ChoiceButton key={s.id} active={formData.situation_pro === s.id} onClick={() => setFormData({ ...formData, situation_pro: s.id })}>
                      {s.label}
                    </ChoiceButton>
                  ))}
                </div>
              </div>
              <Btn variant="primary" onClick={() => setStep(2)} style={{ width: '100%' }}
                disabled={!formData.tranche_age || !formData.situation_pro}>
                Suivant →
              </Btn>
            </motion.div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Centres d'intérêt</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {INTERESTS.map(int => (
                    <button
                      key={int.id} type="button"
                      onClick={() => toggle('interets_assurance', int.id)}
                      style={{
                        padding: '0.5rem 1rem', border: '1px solid',
                        borderColor: formData.interets_assurance.includes(int.id) ? 'var(--gold-dim)' : 'rgba(240,237,230,0.1)',
                        background: formData.interets_assurance.includes(int.id) ? 'rgba(200,169,110,0.1)' : 'transparent',
                        color: formData.interets_assurance.includes(int.id) ? 'var(--gold)' : 'var(--paper-dim)',
                        cursor: 'pointer', fontSize: '0.8125rem', transition: 'all 0.2s', borderRadius: 0,
                      }}
                    >
                      {int.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>
                  Budget mensuel max — <span style={{ color: 'var(--gold)', fontStyle: 'normal' }}>{formData.budget_max_mensuel} €</span>
                </label>
                <input
                  type="range" min="10" max="200" step="5"
                  value={formData.budget_max_mensuel}
                  onChange={e => setFormData({ ...formData, budget_max_mensuel: Number(e.target.value) })}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Btn variant="ghost" onClick={() => setStep(1)}>← Retour</Btn>
                <Btn variant="primary" onClick={() => setStep(3)} style={{ flex: 1 }}
                  disabled={formData.interets_assurance.length === 0}>
                  Suivant →
                </Btn>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Nouveaux champs ── */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Situation familiale</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--gold-line)' }}>
                  {['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/ve'].map(sit => (
                    <ChoiceButton key={sit} active={formData.situation_familiale === sit} onClick={() => setFormData({ ...formData, situation_familiale: sit })}>
                      {sit}
                    </ChoiceButton>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Personnes à charge</label>
                <div style={{ display: 'flex', gap: '1px', background: 'var(--gold-line)' }}>
                  {[0, 1, 2, 3].map(num => (
                    <ChoiceButton key={num} active={formData.nombre_personnes_a_charge === num} onClick={() => setFormData({ ...formData, nombre_personnes_a_charge: num })}>
                      <span style={{ textAlign: 'center', width: '100%' }}>{num}{num === 3 ? '+' : ''}</span>
                    </ChoiceButton>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Couvertures existantes</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {['Santé', 'Habitation', 'Auto', 'Responsabilité civile', 'Voyage', 'Animaux'].map(cov => (
                    <button
                      key={cov} type="button"
                      onClick={() => toggle('couverture_existante', cov)}
                      style={{
                        padding: '0.5rem 1rem', border: '1px solid',
                        borderColor: formData.couverture_existante.includes(cov) ? 'var(--gold-dim)' : 'rgba(240,237,230,0.1)',
                        background: formData.couverture_existante.includes(cov) ? 'rgba(200,169,110,0.1)' : 'transparent',
                        color: formData.couverture_existante.includes(cov) ? 'var(--gold)' : 'var(--paper-dim)',
                        cursor: 'pointer', fontSize: '0.8125rem', transition: 'all 0.2s', borderRadius: 0,
                      }}
                    >
                      {cov}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Votre priorité</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '1px', background: 'var(--gold-line)' }}>
                  {[
                    { id: 'prix_bas', label: 'Prix le plus bas', icon: <Wallet size={16} /> },
                    { id: 'couverture_max', label: 'Couverture maximale', icon: <Shield size={16} /> },
                    { id: 'rapidite', label: 'Rapidité de remboursement', icon: <Activity size={16} /> },
                  ].map(p => (
                    <ChoiceButton key={p.id} active={formData.priorite_assurance === p.id} onClick={() => setFormData({ ...formData, priorite_assurance: p.id })}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {p.icon}
                        <span>{p.label}</span>
                      </div>
                    </ChoiceButton>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Btn variant="ghost" onClick={() => setStep(2)}>← Retour</Btn>
                <Btn variant="primary" onClick={() => setStep(4)} style={{ flex: 1 }}
                  disabled={!formData.situation_familiale || !formData.priorite_assurance}>
                  Suivant →
                </Btn>
              </div>
            </motion.div>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Niveau de risque accepté</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gold-line)' }}>
                  {[
                    { id: 'prudent',  label: 'Prudent',  desc: 'Groupes avec forte réserve de sécurité.' },
                    { id: 'modere',   label: 'Modéré',   desc: 'Équilibre entre économies et sécurité.' },
                    { id: 'ouvert',   label: 'Ouvert',   desc: 'Plus de risques pour des cotisations très faibles.' },
                  ].map(r => (
                    <ChoiceButton key={r.id} active={formData.niveau_risque === r.id} onClick={() => setFormData({ ...formData, niveau_risque: r.id })}>
                      <span style={{ display: 'block', fontWeight: 500, color: 'inherit', marginBottom: '0.2rem' }}>{r.label}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', fontWeight: 300 }}>{r.desc}</span>
                    </ChoiceButton>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Field label="Région (Optionnel)" value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} placeholder="ex : Île-de-France" />
                <p style={{ fontSize: '0.6875rem', color: 'rgba(240,237,230,0.3)', marginTop: '0.125rem' }}>
                  Autorisez l'accès à votre position pour remplir automatiquement ce champ.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Btn variant="ghost" onClick={() => setStep(3)}>← Retour</Btn>
                <Btn variant="primary" onClick={handleSubmit} loading={loading} style={{ flex: 1 }} disabled={!formData.niveau_risque}>
                  Trouver mes groupes
                </Btn>
              </div>
            </motion.div>
          )}

          {/* ── Step 5 — Results ── */}
          {step === 5 && recommendations && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--gold-line)' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', border: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color="var(--gold)" />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--paper)' }}>Groupes Recommandés</p>
                  <p className="text-caption">{recommendations.length} groupe{recommendations.length !== 1 ? 's' : ''} correspondent à votre profil</p>
                </div>
              </div>

              {recommendations.length === 0 ? (
                <p className="text-caption" style={{ paddingBlock: '1.5rem' }}>Aucun groupe parfait, mais explorez les groupes publics.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gold-line)' }}>
                  {recommendations.map(rec => (
                    <div key={rec.groupe.id} style={{ display: 'flex', flexDirection: 'column', background: 'var(--ink-90)', padding: '1.25rem', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--paper)', marginBottom: '0.2rem' }}>{rec.groupe.nom}</p>
                          <p className="text-caption">{rec.groupe.specialite}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                          <Badge variant="gold">Match {Math.round(rec.score_compatibilite * 100)}%</Badge>
                          <Btn variant="secondary" onClick={() => navigate(`/groups/${rec.groupe.id}`)} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>
                            Voir →
                          </Btn>
                        </div>
                      </div>
                      
                      {rec.raisons && rec.raisons.length > 0 && (
                        <div style={{ padding: '0.75rem', background: 'rgba(200,169,110,0.05)', border: '1px solid var(--gold-dim)', borderRadius: '4px' }}>
                          <p style={{ fontSize: '0.75rem', color: 'var(--gold)', marginBottom: '0.5rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Pourquoi ce groupe ?
                          </p>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--paper-dim)', fontSize: '0.8125rem' }}>
                            {rec.raisons.map((r, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Btn variant="primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', marginTop: '0.5rem' }}>
                Aller au Dashboard
              </Btn>
            </motion.div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};
