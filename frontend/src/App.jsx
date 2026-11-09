import './App.css'

import { useEffect, useMemo, useState } from 'react'


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
  AlertCircle,
  CheckCircle2,
  RefreshCw,
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

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

// IMPORTANT:
// Confirm these mappings against your original dataset documentation.
// The notebook confirms numeric categories but does not establish
// which gender code represents which gender.
//
// If your dataset uses the reverse mapping, swap these values.

const genderOptions = [
  { label: 'Female', value: 0 },
  { label: 'Male', value: 1 },
]

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

// These values must match the original dataset encodings.
const fields = [
  {
    name: 'Age',
    label: 'Age',
    description: 'Patient age in years',
    type: 'number',
    step: 1,
    min: 1,
    max: 120,
    suffix: 'years',
  },
  {
    name: 'Gender',
    label: 'Gender',
    description: 'Select the patient gender',
    type: 'select',
    options: genderOptions,
  },
  {
    name: 'BMI',
    label: 'Body Mass Index',
    description: 'Enter the BMI value',
    type: 'number',
    step: 0.1,
    min: 1,
    max: 100,
  },
  {
    name: 'Smoking',
    label: 'Smoking Status',
    description: 'Does the patient smoke?',
    type: 'select',
    options: [
      { label: 'Non-smoker', value: 0 },
      { label: 'Smoker', value: 1 },
    ],
  },
  {
    name: 'GeneticRisk',
    label: 'Genetic Risk',
    description: 'Select the recorded genetic risk category',
    type: 'select',
    options: [
      { label: 'Low', value: 0 },
      { label: 'Medium', value: 1 },
      { label: 'High', value: 2 },
    ],
  },
  {
    name: 'PhysicalActivity',
    label: 'Physical Activity',
    description: 'Daily physical activity',
    type: 'number',
    step: 0.5,
    min: 0,
    max: 24,
    suffix: 'hours/day',
  },
  {
    name: 'AlcoholIntake',
    label: 'Alcohol Intake',
    description: 'Enter the value using the dataset units',
    type: 'number',
    step: 0.5,
    min: 0,
    max: 100,
  },
  {
    name: 'CancerHistory',
    label: 'Previous Cancer History',
    description: 'Has the patient had a previous cancer history?',
    type: 'select',
    options: [
      { label: 'No', value: 0 },
      { label: 'Yes', value: 1 },
    ],
  },
]

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

function MetricCard({ icon: Icon, label, value, suffix = '%' }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <Icon size={19} />
      </div>

      <div className="metric-value">
        {value == null || !Number.isFinite(Number(value))
          ? '—'
          : `${value}${suffix}`}
      </div>
    </div>
  )
}

function PageIntro({ title, description }) {
  return (
    <section className="page-intro">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}

function EmptyState({ message }) {
  return (
    <div className="empty-result">
      <Activity size={34} />
      <p>{message}</p>
    </div>
  )
}

// --------------------------------------------------
// MAIN APPLICATION
// --------------------------------------------------

function App() {
  const [page, setPage] = useState('Dashboard')

  const [patient, setPatient] = useState(initialPatient)

  const [health, setHealth] = useState(null)
  const [metrics, setMetrics] = useState(null)

  const [result, setResult] = useState(null)

  const [loading, setLoading] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [error, setError] = useState('')
  const [metricsError, setMetricsError] = useState('')

  // ------------------------------------------------
  // LOAD BACKEND INFORMATION
  // ------------------------------------------------

  async function loadDashboardData() {
    setMetricsLoading(true)
    setMetricsError('')

    try {
      const healthResponse = await getHealth()
      setHealth(healthResponse)
    } catch {
      setHealth(null)
    }

    try {
      const metricsResponse = await getMetrics()

      setMetrics(metricsResponse)
    } catch (err) {
      setMetrics(null)
      setMetricsError(
        err.message || 'Unable to retrieve model evaluation metrics.'
      )
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // ------------------------------------------------
  // UPDATE FORM VALUES
  // ------------------------------------------------

  function updateField(name, value) {
    setPatient((previous) => ({
      ...previous,
      [name]: Number(value),
    }))

    setResult(null)
    setError('')
  }

  // ------------------------------------------------
  // MODEL PREDICTION
  // ------------------------------------------------

  async function handlePredict(event) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Send numeric values to FastAPI.
      // The backend must recreate all 16 training features.
      const response = await predictCancer(patient)

      if (
        response.prediction === undefined ||
        response.prediction === null
      ) {
        throw new Error('The API response does not contain a prediction.')
      }

      setResult(response)
    } catch (err) {
      setError(
        err.message || 'Unable to generate a prediction. Check the API.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ------------------------------------------------
  // METRIC DATA
  // ------------------------------------------------

  const metricData = useMemo(() => {
    if (!metrics) return []

    const items = [
      { name: 'Accuracy', value: metrics.accuracy },
      { name: 'Precision', value: metrics.precision },
      { name: 'Recall', value: metrics.recall },
      { name: 'F1-score', value: metrics.f1_score },
    ]

    return items
      .filter(
        (item) =>
          item.value !== undefined &&
          item.value !== null &&
          Number.isFinite(Number(item.value))
      )
      .map((item) => ({
        name: item.name,
        value: Number((Number(item.value) * 100).toFixed(2)),
      }))
  }, [metrics])

  const confusionMatrix = metrics?.confusion_matrix

  const isConnected = health?.status === 'healthy'

  // ------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Prediction', icon: HeartPulse },
    { label: 'Model Analysis', icon: ChartNoAxesCombined },
    { label: 'About', icon: ClipboardList },
  ]

  // ------------------------------------------------
  // PREDICTION DISPLAY
  // ------------------------------------------------

  const predictedClass =
    result && Number(result.prediction)

  // Confirm that your dataset uses:
  // Diagnosis 0 = No cancer
  // Diagnosis 1 = Cancer
  //
  // This interpretation must be verified before deployment.

  const predictionLabel =
    predictedClass === 1
      ? 'Positive Prediction'
      : predictedClass === 0
        ? 'Negative Prediction'
        : 'Unknown Prediction'

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

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
              className={`nav-item ${
                page === label ? 'active' : ''
              }`}
              onClick={() => setPage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div
            className="status-dot"
            style={{
              background: isConnected ? '#35d6a0' : '#ff7777',
            }}
          />

          <div>
            <strong>API Status</strong>
            <p>{isConnected ? 'Connected' : 'Disconnected'}</p>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        {/* TOP BAR */}

        <header className="topbar">

          <div>
            <p className="eyebrow">
              HEALTHCARE · MACHINE LEARNING
            </p>

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

        {/* ==========================================
            DASHBOARD
        ========================================== */}

        {page === 'Dashboard' && (
          <>

            <section className="welcome-panel">

              <div>
                <div className="welcome-tag">
                  <Sparkles size={14} />
                  MACHINE LEARNING
                </div>

                <h2>
                  Intelligent Cancer Prediction Analysis
                </h2>

                <p>
                  Explore patient information, generate
                  machine learning predictions and analyze
                  model performance through an interactive
                  healthcare analytics platform.
                </p>

                <button
                  className="primary-button"
                  onClick={() => setPage('Prediction')}
                >
                  Start a Prediction →
                </button>
              </div>

              <div className="welcome-art">
                <BrainCircuit size={100} strokeWidth={1} />
                <Activity size={35} />
              </div>

            </section>

            <div className="section-heading">

              <div>
                <h2>Model Overview</h2>
                <p>
                  Evaluation results from the test dataset
                </p>
              </div>

              <span className={`live-badge ${isConnected ? '' : 'offline'}`}>
                <span />
                {isConnected ? 'API Online' : 'API Offline'}
              </span>

            </div>

            <section className="metric-grid">

              <MetricCard
                icon={ChartNoAxesCombined}
                label="Accuracy"
                value={
                  metrics
                    ? (metrics.accuracy * 100).toFixed(2)
                    : null
                }
              />

              <MetricCard
                icon={ShieldCheck}
                label="Precision"
                value={
                  metrics
                    ? (metrics.precision * 100).toFixed(2)
                    : null
                }
              />

              <MetricCard
                icon={Activity}
                label="Recall"
                value={
                  metrics
                    ? (metrics.recall * 100).toFixed(2)
                    : null
                }
              />

              <MetricCard
                icon={Users}
                label="F1-score"
                value={
                  metrics
                    ? (metrics.f1_score * 100).toFixed(2)
                    : null
                }
              />

            </section>

            <section className="panel">

              <div className="panel-heading">
                <div>
                  <h2>Classification Performance</h2>
                  <p>Model evaluation metrics</p>
                </div>
              </div>

              {metricsLoading ? (
                <p className="muted">Loading model metrics...</p>
              ) : metricData.length > 0 ? (

                <div className="chart">

                  <ResponsiveContainer width="100%" height="100%">

                    <BarChart data={metricData}>

                      <CartesianGrid
                        stroke="#233247"
                        strokeDasharray="3 3"
                      />

                      <XAxis dataKey="name" stroke="#91a4bc" />

                      <YAxis
                        domain={[0, 100]}
                        stroke="#91a4bc"
                      />

                      <Tooltip
                        formatter={(value) => [
                          `${value}%`,
                          'Score',
                        ]}
                        contentStyle={{
                          background: '#101d2e',
                          border: '1px solid #304158',
                          borderRadius: 10,
                        }}
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
                <EmptyState
                  message={
                    metricsError ||
                    'Model metrics are not available. Check the backend metrics endpoint.'
                  }
                />
              )}

            </section>

          </>
        )}

        {/* ==========================================
            PREDICTION PAGE
        ========================================== */}

        {page === 'Prediction' && (
          <>

            <PageIntro
              title="Cancer Prediction Workspace"
              description="Enter the patient information below to generate a machine learning prediction. Select understandable options instead of numerical encoding values."
            />

            <div className="prediction-layout">

              {/* PATIENT FORM */}

              <form
                className="panel patient-form"
                onSubmit={handlePredict}
              >

                <h2>
                  <HeartPulse size={20} />
                  Patient Information
                </h2>

                <p className="muted">
                  Please complete all required fields.
                </p>

                <div className="form-grid">

                  {fields.map((field) => (

                    <label
                      className="field"
                      key={field.name}
                    >

                      <span>{field.label}</span>

                      <small className="field-description">
                        {field.description}
                      </small>

                      {field.type === 'select' ? (

                        <select
                          value={patient[field.name]}
                          required
                          onChange={(event) =>
                            updateField(
                              field.name,
                              event.target.value
                            )
                          }
                        >

                          {field.options.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}

                        </select>

                      ) : (

                        <input
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          required
                          value={patient[field.name]}
                          onChange={(event) =>
                            updateField(
                              field.name,
                              event.target.value
                            )
                          }
                        />

                      )}

                    </label>

                  ))}

                </div>

                <div className="form-note">
                  <ShieldCheck size={17} />

                  <span>
                    Patient information is converted into
                    the numerical format required by the
                    machine learning model.
                  </span>
                </div>

                <button
                  className="primary-button submit-button"
                  disabled={loading}
                  type="submit"
                >
                  {loading
                    ? 'Analyzing Patient Data...'
                    : 'Generate Prediction →'}
                </button>

                {error && (
                  <div className="error-box">
                    <AlertCircle size={18} />
                    <p>{error}</p>
                  </div>
                )}

              </form>

              {/* PREDICTION RESULT */}

              <section className="panel result-panel">

                <div className="result-icon">
                  <BrainCircuit size={30} />
                </div>

                <h2>Prediction Result</h2>

                <p className="muted">
                  Your model prediction will appear here.
                </p>

                {loading ? (

                  <div className="empty-result">
                    <RefreshCw size={34} />
                    <p>Analyzing patient information...</p>
                  </div>

                ) : result ? (

                  <>

                    <div
                      className={`prediction-label ${
                        predictedClass === 1
                          ? 'warning'
                          : 'neutral'
                      }`}
                    >

                      <h3>{predictionLabel}</h3>

                      <p>
                        {predictedClass === 1
                          ? 'The model predicts the positive diagnosis class.'
                          : predictedClass === 0
                            ? 'The model predicts the negative diagnosis class.'
                            : 'The returned class could not be interpreted.'}
                      </p>

                      <small>
                        Model output: {result.prediction}
                      </small>

                    </div>

                    {Array.isArray(result.probabilities) && (

                      <div className="probability-list">

                        <h3>Prediction Probabilities</h3>

                        {result.probabilities.map(
                          (probability, index) => (

                            <div
                              key={index}
                              className="probability-item"
                            >

                              <div className="probability-title">

                                <span>
                                  {index === 0
                                    ? 'Negative class'
                                    : 'Positive class'}
                                </span>

                                <strong>
                                  {(
                                    Number(probability) * 100
                                  ).toFixed(2)}%
                                </strong>

                              </div>

                              <div className="progress-track">

                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${
                                      Number(probability) * 100
                                    }%`,
                                  }}
                                />

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    )}

                    <div className="disclaimer">
                      <strong>Important Medical Disclaimer</strong>

                      <p>
                        This result is generated by an educational
                        machine learning model. It is not a medical
                        diagnosis and should not replace professional
                        medical advice, testing or consultation.
                      </p>
                    </div>

                  </>

                ) : (

                  <EmptyState
                    message="Complete the patient form and click Generate Prediction to view the result."
                  />

                )}

              </section>

            </div>

          </>
        )}

        {/* ==========================================
            MODEL ANALYSIS PAGE
        ========================================== */}

        {page === 'Model Analysis' && (
          <>

            <PageIntro
              title="Model Performance Analysis"
              description="Explore the evaluation results of your trained Random Forest model using test dataset metrics and a confusion matrix."
            />

            <div className="analysis-toolbar">

              <div>
                <span className="status-dot" />
                <span>
                  {metricsLoading
                    ? 'Loading evaluation results'
                    : metrics
                      ? 'Evaluation data available'
                      : 'Evaluation data unavailable'}
                </span>
              </div>

              <button
                className="refresh-button"
                onClick={loadDashboardData}
                disabled={metricsLoading}
              >
                <RefreshCw size={15} />
                Refresh Metrics
              </button>

            </div>

            {metricsError && !metrics && (
              <div className="error-box">
                <AlertCircle size={18} />
                <p>
                  {metricsError}
                  {' '}Check your FastAPI /metrics endpoint.
                </p>
              </div>
            )}

            <section className="metric-grid">

              <MetricCard
                icon={ChartNoAxesCombined}
                label="Accuracy"
                value={
                  metrics
                    ? (metrics.accuracy * 100).toFixed(2)
                    : null
                }
              />

              <MetricCard
                icon={ShieldCheck}
                label="Precision"
                value={
                  metrics
                    ? (metrics.precision * 100).toFixed(2)
                    : null
                }
              />

              <MetricCard
                icon={Activity}
                label="Recall"
                value={
                  metrics
                    ? (metrics.recall * 100).toFixed(2)
                    : null
                }
              />

              <MetricCard
                icon={Users}
                label="F1-score"
                value={
                  metrics
                    ? (metrics.f1_score * 100).toFixed(2)
                    : null
                }
              />

            </section>

            {/* CONFUSION MATRIX */}

            <section className="panel">

              <div className="panel-heading">

                <div>
                  <h2>Confusion Matrix</h2>

                  <p>
                    Actual classes compared with predicted classes
                  </p>
                </div>

              </div>

              {metricsLoading ? (

                <p className="muted">Loading confusion matrix...</p>

              ) : Array.isArray(confusionMatrix) &&
                confusionMatrix.length === 2 &&
                confusionMatrix.every(
                  (row) => Array.isArray(row) && row.length === 2
                ) ? (

                <>

                  <div className="matrix-heading">
                    <span>Predicted Negative</span>
                    <span>Predicted Positive</span>
                  </div>

                  <div className="matrix">

                    {confusionMatrix.map((row, i) =>
                      row.map((value, j) => (

                        <div
                          className="matrix-cell"
                          key={`${i}-${j}`}
                        >

                          <span>
                            Actual {i === 0 ? 'Negative' : 'Positive'}
                            {' · '}
                            Predicted {j === 0 ? 'Negative' : 'Positive'}
                          </span>

                          <strong>{value}</strong>

                          <small>
                            {i === j
                              ? 'Correct prediction'
                              : 'Incorrect prediction'}
                          </small>

                        </div>

                      ))
                    )}

                  </div>

                  <p className="muted matrix-explanation">
                    The diagonal cells represent correct predictions.
                    The other cells represent incorrect predictions.
                  </p>

                </>

              ) : (

                <EmptyState
                  message="Confusion matrix is unavailable. Your backend must return a 2 × 2 confusion_matrix."
                />

              )}

            </section>

            {/* PERFORMANCE CHART */}

            <section className="panel">

              <div className="panel-heading">

                <div>
                  <h2>Classification Performance</h2>
                  <p>
                    Evaluation metrics represented as percentages
                  </p>
                </div>

              </div>

              {metricData.length > 0 ? (

                <div className="chart">

                  <ResponsiveContainer width="100%" height="100%">

                    <BarChart data={metricData}>

                      <CartesianGrid
                        stroke="#233247"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="name"
                        stroke="#91a4bc"
                      />

                      <YAxis
                        domain={[0, 100]}
                        stroke="#91a4bc"
                      />

                      <Tooltip
                        formatter={(value) => [
                          `${value}%`,
                          'Performance',
                        ]}
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

                <EmptyState
                  message="Performance chart requires evaluation metrics from the backend."
                />

              )}

            </section>

            {/* METRIC EXPLANATION */}

            <section className="panel">

              <h2>Understanding Model Metrics</h2>

              <div className="metric-explanations">

                <div>
                  <strong>Accuracy</strong>
                  <p>
                    The proportion of all predictions that are correct.
                  </p>
                </div>

                <div>
                  <strong>Precision</strong>
                  <p>
                    Among positive predictions, the proportion
                    that are actually positive.
                  </p>
                </div>

                <div>
                  <strong>Recall</strong>
                  <p>
                    Among actual positive cases, the proportion
                    correctly identified by the model.
                  </p>
                </div>

                <div>
                  <strong>F1-score</strong>
                  <p>
                    The harmonic mean of precision and recall.
                  </p>
                </div>

              </div>

            </section>

          </>
        )}

        {/* ==========================================
            ABOUT PAGE
        ========================================== */}

        {page === 'About' && (

          <section className="panel about-panel">

            <BrainCircuit size={42} />

            <h2>CancerAI - Cancer Prediction Analysis</h2>

            <p>
              CancerAI is an educational machine learning
              application developed to explore cancer-related
              patient data and demonstrate predictive analytics.
            </p>

            <p>
              The application integrates a React frontend,
              FastAPI backend and a trained Random Forest
              regression model to demonstrate data-driven
              prediction and model evaluation.
            </p>

            <h3>Technology Stack</h3>

            <div className="tech-tags">

              {[
                'Python',
                'Pandas',
                'NumPy',
                'Scikit-learn',
                'Random Forest',
                'FastAPI',
                'React',
                'Vite',
                'Recharts',
              ].map((item) => (

                <span key={item}>{item}</span>

              ))}

            </div>

            <h3>Project Features</h3>

            <ul className="about-features">
              <li>Patient information input</li>
              <li>Machine learning prediction</li>
              <li>Model performance evaluation</li>
              <li>Confusion matrix visualization</li>
              <li>Interactive dashboard</li>
            </ul>

            <div className="disclaimer">

              <strong>Educational Purpose Only</strong>

              <p>
                This application is a student machine learning
                project. It is not a clinically validated
                diagnostic system and must not be used to
                make medical decisions.
              </p>

            </div>

          </section>

        )}

        {/* FOOTER */}

        <footer>

          <span>
            © 2026 CancerAI · Machine Learning Project
          </span>

          <span>
            <ShieldCheck size={14} />
            Educational Use Only
          </span>

        </footer>

      </main>

    </div>
  )
}

export default App