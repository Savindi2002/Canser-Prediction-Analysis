
import { useEffect, useState } from 'react'
import {
  Activity,
  BrainCircuit,
  ChartNoAxesCombined,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts'

import { getHealth, getMetrics, predictCancer } from './api'

const initialPatient = {
  Age: 45,
  Gender: 1,
  BMI: 24.5,
  Smoking: 0,
  GeneticRisk: 1,
  PhysicalActivity: 2,
  AlcoholIntake: 1,
  CancerHistory: 0,
}

const fields = [
  { name: 'Age', label: 'Age', type: 'number', step: 1 },
  { name: 'Gender', label: 'Gender (encoded)', type: 'select' },
  { name: 'BMI', label: 'BMI', type: 'number', step: 0.1 },
  { name: 'Smoking', label: 'Smoking (encoded)', type: 'select' },
  {
    name: 'GeneticRisk',
    label: 'Genetic risk (encoded)',
    type: 'genetic',
  },
  {
    name: 'PhysicalActivity',
    label: 'Physical activity (hours/day)',
    type: 'number',
    step: 0.5,
  },
  {
    name: 'AlcoholIntake',
    label: 'Alcohol intake (dataset units)',
    type: 'number',
    step: 0.5,
  },
  {
    name: 'CancerHistory',
    label: 'Cancer history (encoded)',
    type: 'select',
  },
]

function MetricCard({ icon: Icon, label, value, suffix = '' }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <div className="metric-value">
        {value == null ? '—' : `${value}${suffix}`}
      </div>
    </div>
  )
}

function App() {
  const [page, setPage] = useState('Dashboard')
  const [patient, setPatient] = useState(initialPatient)
  const [health, setHealth] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))

    getMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null))
  }, [])

  function updateField(name, value) {
    setPatient((previous) => ({
      ...previous,
      [name]: Number(value),
    }))
  }

  async function handlePredict(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await predictCancer(patient)
      setResult(response)
    } catch (err) {
      setError(err.message || 'Could not connect to the prediction API.')
    } finally {
      setLoading(false)
    }
  }

  const metricData = metrics
    ? [
        { name: 'Accuracy', value: metrics.accuracy },
        { name: 'Precision', value: metrics.precision },
        { name: 'Recall', value: metrics.recall },
        { name: 'F1-score', value: metrics.f1_score },
      ].map((item) => ({
        ...item,
        value: Number((item.value * 100).toFixed(2)),
      }))
    : []

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Prediction', icon: HeartPulse },
    { label: 'Model Analysis', icon: ChartNoAxesCombined },
    { label: 'About', icon: ClipboardList },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <BrainCircuit size={25} />
          </div>
          <div>
            <h2>CancerAI</h2>
            <p>ML ANALYTICS PLATFORM</p>
          </div>
        </div>

        <div className="nav-caption">WORKSPACE</div>

        <nav>
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? 'active' : ''}`}
              onClick={() => setPage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <strong>API Status</strong>
            <p>{health?.status === 'healthy' ? 'Connected' : 'Disconnected'}</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">HEALTHCARE · MACHINE LEARNING</p>
            <h1>{page}</h1>
          </div>
          <div className="profile">
            <div className="avatar">SH</div>
            <div>
              <strong>Savindi Hewage</strong>
              <p>Data Science Project</p>
            </div>
          </div>
        </header>

        {page === 'Dashboard' && (
          <>
            <section className="welcome-panel">
              <div>
                <div className="welcome-tag">
                  <Sparkles size={14} /> MACHINE LEARNING
                </div>
                <h2>Explore your cancer dataset.</h2>
                <p>
                  Analyze model performance and explore predictions
                  from your trained classification model.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setPage('Prediction')}
                >
                  Open prediction form →
                </button>
              </div>
              <div className="welcome-art">
                <BrainCircuit size={100} strokeWidth={1} />
                <Activity size={35} />
              </div>
            </section>

            <div className="section-heading">
              <div>
                <h2>Model overview</h2>
                <p>Performance on the held-out test dataset</p>
              </div>
              <span className="live-badge">
                <span /> {health?.status === 'healthy' ? 'API Online' : 'API Offline'}
              </span>
            </div>

            <section className="metric-grid">
              <MetricCard
                icon={ChartNoAxesCombined}
                label="Accuracy"
                value={metrics ? (metrics.accuracy * 100).toFixed(2) : null}
                suffix="%"
              />
              <MetricCard
                icon={ShieldCheck}
                label="Precision"
                value={metrics ? (metrics.precision * 100).toFixed(2) : null}
                suffix="%"
              />
              <MetricCard
                icon={Activity}
                label="Recall"
                value={metrics ? (metrics.recall * 100).toFixed(2) : null}
                suffix="%"
              />
              <MetricCard
                icon={Users}
                label="F1-score"
                value={metrics ? (metrics.f1_score * 100).toFixed(2) : null}
                suffix="%"
              />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Classification performance</h2>
                  <p>Test-set metrics in percentage</p>
                </div>
              </div>
              {metricData.length > 0 ? (
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricData}>
                      <CartesianGrid stroke="#233247" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#91a4bc" />
                      <YAxis domain={[0, 100]} stroke="#91a4bc" />
                      <Tooltip
                        contentStyle={{
                          background: '#101d2e',
                          border: '1px solid #304158',
                          borderRadius: 10,
                        }}
                        formatter={(value) => [`${value}%`, 'Score']}
                      />
                      <Bar
                        dataKey="value"
                        fill="#35d6bd"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="muted">Model metrics are unavailable.</p>
              )}
            </section>
          </>
        )}

        {page === 'Prediction' && (
          <>
            <section className="page-intro">
              <h2>Prediction workspace</h2>
              <p>
                Enter values using the encodings and units of your
                training dataset.
              </p>
            </section>

            <div className="prediction-layout">
              <form className="panel patient-form" onSubmit={handlePredict}>
                <h2><HeartPulse size={20} /> Patient features</h2>
                <p className="muted">Complete all fields to run the model.</p>

                <div className="form-grid">
                  {fields.map((field) => (
                    <label className="field" key={field.name}>
                      <span>{field.label}</span>

                      {field.type === 'select' ? (
                        <select
                          value={patient[field.name]}
                          onChange={(event) =>
                            updateField(field.name, event.target.value)
                          }
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                        </select>
                      ) : field.type === 'genetic' ? (
                        <select
                          value={patient[field.name]}
                          onChange={(event) =>
                            updateField(field.name, event.target.value)
                          }
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          min={field.name === 'BMI' ? 0.01 : 0}
                          max={
                            field.name === 'Age'
                              ? 120
                              : field.name === 'BMI'
                                ? 100
                                : field.name === 'PhysicalActivity'
                                  ? 24
                                  : 100
                          }
                          step={field.step}
                          required
                          value={patient[field.name]}
                          onChange={(event) =>
                            updateField(field.name, event.target.value)
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>

                <button className="primary-button submit-button" disabled={loading}>
                  {loading ? 'Analyzing...' : 'Run model prediction →'}
                </button>
                {error && <p className="error-message">{error}</p>}
              </form>

              <section className="panel result-panel">
                <div className="result-icon"><BrainCircuit size={30} /></div>
                <h2>Prediction result</h2>
                <p className="muted">
                  Your model output will appear here.
                </p>

                {result ? (
                  <>
                    <div className={`prediction-label ${result.prediction === 1 ? 'warning' : 'neutral'}`}>
                      Predicted class: {result.prediction}
                    </div>

                    {result.probabilities && (
                      <div className="probability-list">
                        {result.probabilities.map((probability, index) => (
                          <div key={index} className="probability-item">
                            <div className="probability-title">
                              <span>Class {index}</span>
                              <strong>{(probability * 100).toFixed(2)}%</strong>
                            </div>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{ width: `${probability * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="disclaimer">{result.disclaimer}</p>
                  </>
                ) : (
                  <div className="empty-result">
                    <Activity size={34} />
                    <p>Submit the form to see the model output.</p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {page === 'Model Analysis' && (
          <>
            <section className="page-intro">
              <h2>Model evaluation</h2>
              <p>Metrics calculated on the held-out test set.</p>
            </section>

            <section className="metric-grid">
              <MetricCard icon={ChartNoAxesCombined} label="Accuracy" value={metrics ? (metrics.accuracy * 100).toFixed(2) : null} suffix="%" />
              <MetricCard icon={ShieldCheck} label="Precision" value={metrics ? (metrics.precision * 100).toFixed(2) : null} suffix="%" />
              <MetricCard icon={Activity} label="Recall" value={metrics ? (metrics.recall * 100).toFixed(2) : null} suffix="%" />
              <MetricCard icon={Users} label="F1-score" value={metrics ? (metrics.f1_score * 100).toFixed(2) : null} suffix="%" />
            </section>

            <section className="panel">
              <h2>Confusion matrix</h2>
              {metrics?.confusion_matrix ? (
                <div className="matrix">
                  {metrics.confusion_matrix.flatMap((row, i) =>
                    row.map((value, j) => (
                      <div className="matrix-cell" key={`${i}-${j}`}>
                        <span>{`Actual ${i} · Predicted ${j}`}</span>
                        <strong>{value}</strong>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="muted">Confusion matrix is unavailable.</p>
              )}
            </section>

            <section className="panel">
              <h2>Classification performance</h2>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricData}>
                    <CartesianGrid stroke="#233247" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#91a4bc" />
                    <YAxis domain={[0, 100]} stroke="#91a4bc" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#35d6bd" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

        {page === 'About' && (
          <section className="panel about-panel">
            <BrainCircuit size={42} />
            <h2>Cancer Prediction Analysis</h2>
            <p>
              An educational machine learning project exploring
              cancer-related patient data using Python, scikit-learn,
              FastAPI and React.
            </p>
            <h3>Technology stack</h3>
            <div className="tech-tags">
              {['Python', 'Pandas', 'Scikit-learn', 'FastAPI', 'React', 'Vite', 'Recharts'].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <p className="disclaimer">
              This application is for educational and portfolio purposes
              only. Model predictions are not medical diagnoses and must
              not be used for clinical decisions.
            </p>
          </section>
        )}

        <footer>
          <span>© 2026 CancerAI · Machine Learning Portfolio Project</span>
          <span><ShieldCheck size={14} /> Educational use only</span>
        </footer>
      </main>
    </div>
  )
}

export default App
