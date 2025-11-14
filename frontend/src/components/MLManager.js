import React, { useState, useEffect } from 'react';
import './MLManager.css';

const MLManager = () => {
  const [activeTab, setActiveTab] = useState('models');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Models State
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [newModelName, setNewModelName] = useState('');
  const [newModelDesc, setNewModelDesc] = useState('');
  const [newModelType, setNewModelType] = useState('image_classification');
  const [newModelFramework, setNewModelFramework] = useState('tensorflow');

  // Training Jobs State
  const [trainingJobs, setTrainingJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [newJobName, setNewJobName] = useState('');
  const [jobModelId, setJobModelId] = useState('');
  const [jobDatasetPath, setJobDatasetPath] = useState('');
  const [jobEpochs, setJobEpochs] = useState(10);
  const [jobBatchSize, setJobBatchSize] = useState(32);
  const [jobLearningRate, setJobLearningRate] = useState(0.001);

  // Inference State
  const [inferenceModelId, setInferenceModelId] = useState('');
  const [inferenceInput, setInferenceInput] = useState('');
  const [inferenceResults, setInferenceResults] = useState(null);

  // Datasets State
  const [datasets, setDatasets] = useState([]);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDesc, setNewDatasetDesc] = useState('');
  const [newDatasetType, setNewDatasetType] = useState('image');
  const [datasetSamples, setDatasetSamples] = useState(1000);

  // Statistics State
  const [statistics, setStatistics] = useState(null);

  const modelTypes = [
    { value: 'image_classification', label: 'Image Classification' },
    { value: 'text_classification', label: 'Text Classification' },
    { value: 'object_detection', label: 'Object Detection' },
    { value: 'sentiment_analysis', label: 'Sentiment Analysis' },
    { value: 'recommendation', label: 'Recommendation' },
    { value: 'regression', label: 'Regression' },
    { value: 'clustering', label: 'Clustering' },
    { value: 'time_series', label: 'Time Series' }
  ];

  const frameworks = [
    { value: 'tensorflow', label: 'TensorFlow', icon: '🔶' },
    { value: 'pytorch', label: 'PyTorch', icon: '🔥' },
    { value: 'scikit_learn', label: 'Scikit-Learn', icon: '📊' },
    { value: 'keras', label: 'Keras', icon: '🧠' },
    { value: 'xgboost', label: 'XGBoost', icon: '⚡' },
    { value: 'huggingface', label: 'HuggingFace', icon: '🤗' }
  ];

  useEffect(() => {
    loadModels();
    loadTrainingJobs();
    loadDatasets();
    loadStatistics();
  }, []);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Models Functions
  const loadModels = async () => {
    try {
      const response = await fetch('/api/ml/models?user_id=current_user');
      const data = await response.json();
      if (data.success) {
        setModels(data.models);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const createModel = async () => {
    if (!newModelName.trim()) {
      showMessage('Lütfen model adı girin', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ml/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newModelName,
          description: newModelDesc,
          model_type: newModelType,
          framework: newModelFramework,
          user_id: 'current_user',
          input_shape: [224, 224, 3],
          output_shape: [10],
          tags: []
        })
      });

      const data = await response.json();
      if (data.success) {
        await loadModels();
        setNewModelName('');
        setNewModelDesc('');
        showMessage('Model başarıyla oluşturuldu!', 'success');
      } else {
        showMessage(data.error || 'Model oluşturulamadı', 'error');
      }
    } catch (error) {
      showMessage('Model oluşturma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteModel = async (modelId) => {
    if (!window.confirm('Bu modeli silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/ml/models/${modelId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        await loadModels();
        showMessage('Model silindi', 'success');
      } else {
        showMessage(data.error || 'Model silinemedi', 'error');
      }
    } catch (error) {
      showMessage('Model silme hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deployModel = async (modelId) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ml/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          config: {
            replicas: 2,
            memory_mb: 2048,
            gpu_enabled: false
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        await loadModels();
        showMessage('Model başarıyla deploy edildi!', 'success');
      } else {
        showMessage(data.error || 'Deploy başarısız', 'error');
      }
    } catch (error) {
      showMessage('Deploy hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Training Functions
  const loadTrainingJobs = async () => {
    try {
      const response = await fetch('/api/ml/training-jobs');
      const data = await response.json();
      if (data.success) {
        setTrainingJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error loading training jobs:', error);
    }
  };

  const createTrainingJob = async () => {
    if (!newJobName.trim() || !jobModelId || !jobDatasetPath) {
      showMessage('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ml/training-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: jobModelId,
          name: newJobName,
          dataset_path: jobDatasetPath,
          user_id: 'current_user',
          num_epochs: jobEpochs,
          batch_size: jobBatchSize,
          learning_rate: jobLearningRate,
          optimizer: 'adam',
          loss_function: 'categorical_crossentropy',
          gpu_enabled: false
        })
      });

      const data = await response.json();
      if (data.success) {
        await loadTrainingJobs();
        setNewJobName('');
        setJobDatasetPath('');
        showMessage('Training job oluşturuldu!', 'success');
      } else {
        showMessage(data.error || 'Job oluşturulamadı', 'error');
      }
    } catch (error) {
      showMessage('Job oluşturma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startTrainingJob = async (jobId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ml/training-jobs/${jobId}/start`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        await loadTrainingJobs();
        showMessage('Training başlatıldı!', 'success');
      } else {
        showMessage(data.error || 'Training başlatılamadı', 'error');
      }
    } catch (error) {
      showMessage('Training başlatma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const stopTrainingJob = async (jobId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ml/training-jobs/${jobId}/stop`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        await loadTrainingJobs();
        showMessage('Training durduruldu', 'success');
      } else {
        showMessage(data.error || 'Training durdurulamadı', 'error');
      }
    } catch (error) {
      showMessage('Training durdurma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Inference Functions
  const runInference = async () => {
    if (!inferenceModelId || !inferenceInput.trim()) {
      showMessage('Lütfen model ve input seçin', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: inferenceModelId,
          input_data: inferenceInput,
          user_id: 'current_user',
          max_results: 5
        })
      });

      const data = await response.json();
      if (data.success) {
        setInferenceResults(data.result);
        showMessage('Inference tamamlandı!', 'success');
      } else {
        showMessage(data.error || 'Inference başarısız', 'error');
      }
    } catch (error) {
      showMessage('Inference hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Dataset Functions
  const loadDatasets = async () => {
    try {
      const response = await fetch('/api/ml/datasets?user_id=current_user');
      const data = await response.json();
      if (data.success) {
        setDatasets(data.datasets);
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
    }
  };

  const createDataset = async () => {
    if (!newDatasetName.trim()) {
      showMessage('Lütfen dataset adı girin', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ml/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDatasetName,
          description: newDatasetDesc,
          dataset_type: newDatasetType,
          user_id: 'current_user',
          num_samples: datasetSamples,
          num_features: 100,
          num_classes: 10,
          labels: ['class_0', 'class_1', 'class_2']
        })
      });

      const data = await response.json();
      if (data.success) {
        await loadDatasets();
        setNewDatasetName('');
        setNewDatasetDesc('');
        showMessage('Dataset oluşturuldu!', 'success');
      } else {
        showMessage(data.error || 'Dataset oluşturulamadı', 'error');
      }
    } catch (error) {
      showMessage('Dataset oluşturma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/ml/statistics');
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#95a5a6',
      training: '#f39c12',
      ready: '#27ae60',
      deployed: '#3498db',
      pending: '#95a5a6',
      running: '#3498db',
      completed: '#27ae60',
      failed: '#e74c3c',
      cancelled: '#95a5a6'
    };
    return colors[status] || '#95a5a6';
  };

  return (
    <div className="ml-manager">
      <div className="ml-header">
        <h2>🤖 Machine Learning Yönetimi</h2>
        <p>Model eğitimi, inference ve ML workflow yönetimi</p>
      </div>

      {message.text && (
        <div className={`ml-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="ml-tabs">
        <button
          className={activeTab === 'models' ? 'active' : ''}
          onClick={() => setActiveTab('models')}
        >
          🧠 Modeller
        </button>
        <button
          className={activeTab === 'training' ? 'active' : ''}
          onClick={() => setActiveTab('training')}
        >
          🎓 Training
        </button>
        <button
          className={activeTab === 'inference' ? 'active' : ''}
          onClick={() => setActiveTab('inference')}
        >
          🔮 Inference
        </button>
        <button
          className={activeTab === 'datasets' ? 'active' : ''}
          onClick={() => setActiveTab('datasets')}
        >
          📊 Datasets
        </button>
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          📈 İstatistikler
        </button>
      </div>

      <div className="ml-content">
        {activeTab === 'models' && (
          <div className="models-tab">
            <div className="create-model-section">
              <h3>Yeni Model Oluştur</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Model Adı</label>
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Örn: Image Classifier v1"
                  />
                </div>
                <div className="form-group">
                  <label>Model Tipi</label>
                  <select value={newModelType} onChange={(e) => setNewModelType(e.target.value)}>
                    {modelTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Framework</label>
                  <div className="framework-grid">
                    {frameworks.map(fw => (
                      <label
                        key={fw.value}
                        className={`framework-option ${newModelFramework === fw.value ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="framework"
                          value={fw.value}
                          checked={newModelFramework === fw.value}
                          onChange={(e) => setNewModelFramework(e.target.value)}
                        />
                        <span className="fw-icon">{fw.icon}</span>
                        <span>{fw.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={newModelDesc}
                  onChange={(e) => setNewModelDesc(e.target.value)}
                  placeholder="Model açıklaması..."
                  rows="3"
                />
              </div>
              <button className="create-button" onClick={createModel} disabled={loading}>
                {loading ? 'Oluşturuluyor...' : '🧠 Model Oluştur'}
              </button>
            </div>

            <div className="models-list">
              <h3>Modellerim ({models.length})</h3>
              <div className="models-grid">
                {models.map(model => (
                  <div key={model.model_id} className="model-card">
                    <div className="model-header">
                      <h4>{model.name}</h4>
                      <span
                        className="model-status"
                        style={{ backgroundColor: getStatusColor(model.status) }}
                      >
                        {model.status}
                      </span>
                    </div>
                    <div className="model-info">
                      <p><strong>Tip:</strong> {model.model_type}</p>
                      <p><strong>Framework:</strong> {model.framework}</p>
                      <p><strong>Version:</strong> {model.version}</p>
                      <p><strong>Parametre Sayısı:</strong> {model.num_parameters.toLocaleString()}</p>
                      <p><strong>Model Boyutu:</strong> {model.model_size_mb} MB</p>
                      <p><strong>Oluşturma:</strong> {formatDate(model.created_at)}</p>
                      {model.metrics && model.metrics.accuracy && (
                        <p><strong>Accuracy:</strong> {(model.metrics.accuracy * 100).toFixed(2)}%</p>
                      )}
                    </div>
                    <div className="model-actions">
                      {model.status === 'ready' && !model.is_deployed && (
                        <button
                          className="deploy-button"
                          onClick={() => deployModel(model.model_id)}
                        >
                          🚀 Deploy
                        </button>
                      )}
                      {model.is_deployed && (
                        <div className="deployed-badge">
                          ✓ Deployed
                        </div>
                      )}
                      <button
                        className="delete-button"
                        onClick={() => deleteModel(model.model_id)}
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="training-tab">
            <div className="create-job-section">
              <h3>Yeni Training Job</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Job Adı</label>
                  <input
                    type="text"
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    placeholder="Örn: Training Run #1"
                  />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <select value={jobModelId} onChange={(e) => setJobModelId(e.target.value)}>
                    <option value="">Model seçin...</option>
                    {models.map(model => (
                      <option key={model.model_id} value={model.model_id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Dataset Path</label>
                  <input
                    type="text"
                    value={jobDatasetPath}
                    onChange={(e) => setJobDatasetPath(e.target.value)}
                    placeholder="/data/datasets/my-dataset"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Epochs: {jobEpochs}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={jobEpochs}
                    onChange={(e) => setJobEpochs(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Batch Size: {jobBatchSize}</label>
                  <input
                    type="range"
                    min="8"
                    max="256"
                    step="8"
                    value={jobBatchSize}
                    onChange={(e) => setJobBatchSize(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Learning Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={jobLearningRate}
                    onChange={(e) => setJobLearningRate(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <button className="create-button" onClick={createTrainingJob} disabled={loading}>
                {loading ? 'Oluşturuluyor...' : '🎓 Job Oluştur'}
              </button>
            </div>

            <div className="jobs-list">
              <h3>Training Jobs ({trainingJobs.length})</h3>
              <div className="jobs-grid">
                {trainingJobs.map(job => (
                  <div key={job.job_id} className="job-card">
                    <div className="job-header">
                      <h4>{job.name}</h4>
                      <span
                        className="job-status"
                        style={{ backgroundColor: getStatusColor(job.status) }}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="job-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${job.progress_percent}%` }}
                        />
                      </div>
                      <span>{job.progress_percent.toFixed(1)}%</span>
                    </div>
                    <div className="job-info">
                      <p><strong>Epochs:</strong> {job.current_epoch} / {job.total_epochs}</p>
                      <p><strong>Batch Size:</strong> {job.batch_size}</p>
                      <p><strong>Learning Rate:</strong> {job.learning_rate}</p>
                      <p><strong>Optimizer:</strong> {job.optimizer}</p>
                      {job.started_at && (
                        <p><strong>Başlangıç:</strong> {formatDate(job.started_at)}</p>
                      )}
                    </div>
                    <div className="job-actions">
                      {job.status === 'pending' && (
                        <button
                          className="start-button"
                          onClick={() => startTrainingJob(job.job_id)}
                        >
                          ▶️ Başlat
                        </button>
                      )}
                      {job.status === 'running' && (
                        <button
                          className="stop-button"
                          onClick={() => stopTrainingJob(job.job_id)}
                        >
                          ⏸️ Durdur
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inference' && (
          <div className="inference-tab">
            <div className="inference-section">
              <h3>Model Inference</h3>
              <div className="form-group">
                <label>Model Seçin</label>
                <select
                  value={inferenceModelId}
                  onChange={(e) => setInferenceModelId(e.target.value)}
                >
                  <option value="">Model seçin...</option>
                  {models.filter(m => m.is_deployed || m.status === 'ready').map(model => (
                    <option key={model.model_id} value={model.model_id}>
                      {model.name} {model.is_deployed ? '(Deployed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Input Data</label>
                <textarea
                  value={inferenceInput}
                  onChange={(e) => setInferenceInput(e.target.value)}
                  placeholder='Örn: "Bu ürün gerçekten harika!" veya görsel path'
                  rows="4"
                />
              </div>
              <button
                className="inference-button"
                onClick={runInference}
                disabled={loading}
              >
                {loading ? 'İşleniyor...' : '🔮 Inference Çalıştır'}
              </button>

              {inferenceResults && (
                <div className="inference-results">
                  <h4>Sonuçlar</h4>
                  <div className="results-info">
                    <p><strong>İşlem Süresi:</strong> {inferenceResults.processing_time_ms} ms</p>
                    <p><strong>Model Version:</strong> {inferenceResults.model_version}</p>
                    <p><strong>Timestamp:</strong> {formatDate(inferenceResults.timestamp)}</p>
                  </div>
                  <div className="predictions-list">
                    <h5>Tahminler:</h5>
                    {inferenceResults.predictions.map((pred, idx) => (
                      <div key={idx} className="prediction-item">
                        <div className="prediction-bar">
                          <div className="prediction-label">
                            <span className="prediction-rank">#{idx + 1}</span>
                            <span className="prediction-class">{pred.class_name}</span>
                          </div>
                          <div className="prediction-prob">
                            <div
                              className="prob-bar"
                              style={{ width: `${pred.probability * 100}%` }}
                            />
                            <span>{(pred.probability * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'datasets' && (
          <div className="datasets-tab">
            <div className="create-dataset-section">
              <h3>Yeni Dataset Oluştur</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Dataset Adı</label>
                  <input
                    type="text"
                    value={newDatasetName}
                    onChange={(e) => setNewDatasetName(e.target.value)}
                    placeholder="Örn: CIFAR-10 Custom"
                  />
                </div>
                <div className="form-group">
                  <label>Tip</label>
                  <select value={newDatasetType} onChange={(e) => setNewDatasetType(e.target.value)}>
                    <option value="image">Image</option>
                    <option value="text">Text</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="tabular">Tabular</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Sample Sayısı: {datasetSamples}</label>
                <input
                  type="range"
                  min="100"
                  max="100000"
                  step="100"
                  value={datasetSamples}
                  onChange={(e) => setDatasetSamples(parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={newDatasetDesc}
                  onChange={(e) => setNewDatasetDesc(e.target.value)}
                  placeholder="Dataset açıklaması..."
                  rows="3"
                />
              </div>
              <button className="create-button" onClick={createDataset} disabled={loading}>
                {loading ? 'Oluşturuluyor...' : '📊 Dataset Oluştur'}
              </button>
            </div>

            <div className="datasets-list">
              <h3>Datasets ({datasets.length})</h3>
              <div className="datasets-grid">
                {datasets.map(dataset => (
                  <div key={dataset.dataset_id} className="dataset-card">
                    <h4>{dataset.name}</h4>
                    <div className="dataset-info">
                      <p><strong>Tip:</strong> {dataset.dataset_type}</p>
                      <p><strong>Samples:</strong> {dataset.num_samples.toLocaleString()}</p>
                      <p><strong>Features:</strong> {dataset.num_features}</p>
                      <p><strong>Classes:</strong> {dataset.num_classes}</p>
                      <p><strong>Boyut:</strong> {dataset.size_mb} MB</p>
                      <p><strong>Train/Val/Test:</strong> {(dataset.train_split * 100).toFixed(0)}% / {(dataset.val_split * 100).toFixed(0)}% / {(dataset.test_split * 100).toFixed(0)}%</p>
                      <p><strong>Oluşturma:</strong> {formatDate(dataset.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && statistics && (
          <div className="stats-tab">
            <h3>ML İstatistikleri</h3>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🧠</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_models}</div>
                  <div className="stat-label">Toplam Model</div>
                  <div className="stat-sub">{statistics.deployed_models} deployed</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🎓</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_training_jobs}</div>
                  <div className="stat-label">Training Jobs</div>
                  <div className="stat-sub">{statistics.running_jobs} çalışıyor</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_datasets}</div>
                  <div className="stat-label">Datasets</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔮</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_predictions}</div>
                  <div className="stat-label">Predictions</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <div className="stat-value">{(statistics.average_accuracy * 100).toFixed(1)}%</div>
                  <div className="stat-label">Avg Accuracy</div>
                </div>
              </div>
            </div>

            <div className="distribution-section">
              <h4>Framework Dağılımı</h4>
              <div className="distribution-chart">
                {Object.entries(statistics.framework_distribution).map(([framework, count]) => (
                  <div key={framework} className="distribution-item">
                    <div className="distribution-label">{framework}</div>
                    <div className="distribution-bar">
                      <div
                        className="distribution-fill"
                        style={{
                          width: `${(count / statistics.total_models) * 100}%`
                        }}
                      >
                        <span>{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="distribution-section">
              <h4>Model Tipi Dağılımı</h4>
              <div className="distribution-chart">
                {Object.entries(statistics.type_distribution).map(([type, count]) => (
                  <div key={type} className="distribution-item">
                    <div className="distribution-label">{type}</div>
                    <div className="distribution-bar">
                      <div
                        className="distribution-fill"
                        style={{
                          width: `${(count / statistics.total_models) * 100}%`,
                          backgroundColor: '#3498db'
                        }}
                      >
                        <span>{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MLManager;
