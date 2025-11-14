"""
Machine Learning Integration Manager
Handles model management, training, inference, and ML workflows
"""
import json
import os
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional, Tuple
import secrets
import hashlib


class ModelType(Enum):
    """Types of ML models"""
    IMAGE_CLASSIFICATION = "image_classification"
    TEXT_CLASSIFICATION = "text_classification"
    OBJECT_DETECTION = "object_detection"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    RECOMMENDATION = "recommendation"
    CLUSTERING = "clustering"
    REGRESSION = "regression"
    TIME_SERIES = "time_series"
    NLP = "nlp"
    COMPUTER_VISION = "computer_vision"


class ModelFramework(Enum):
    """Supported ML frameworks"""
    TENSORFLOW = "tensorflow"
    PYTORCH = "pytorch"
    SCIKIT_LEARN = "scikit_learn"
    KERAS = "keras"
    XGBOOST = "xgboost"
    ONNX = "onnx"
    HUGGINGFACE = "huggingface"
    CUSTOM = "custom"


class TrainingStatus(Enum):
    """Training job status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ModelStatus(Enum):
    """Model deployment status"""
    DRAFT = "draft"
    TRAINING = "training"
    READY = "ready"
    DEPLOYED = "deployed"
    ARCHIVED = "archived"


@dataclass
class ModelMetrics:
    """Model performance metrics"""
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    loss: float
    additional_metrics: Dict[str, float]

    def to_dict(self):
        return asdict(self)


@dataclass
class MLModel:
    """ML model representation"""
    model_id: str
    name: str
    description: str
    model_type: str
    framework: str
    version: str
    status: str
    created_at: str
    updated_at: str
    created_by: str

    # Model details
    input_shape: List[int]
    output_shape: List[int]
    num_parameters: int
    model_size_mb: float

    # Performance
    metrics: Dict[str, Any]
    training_time_seconds: float
    inference_time_ms: float

    # Deployment
    is_deployed: bool
    endpoint_url: Optional[str]
    deployment_config: Dict[str, Any]

    # Files
    model_path: str
    weights_path: Optional[str]
    config_path: Optional[str]

    # Tags and metadata
    tags: List[str]
    metadata: Dict[str, Any]

    def to_dict(self):
        return asdict(self)


@dataclass
class TrainingJob:
    """Training job representation"""
    job_id: str
    model_id: str
    name: str
    status: str
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    created_by: str

    # Training configuration
    dataset_path: str
    num_epochs: int
    batch_size: int
    learning_rate: float
    optimizer: str
    loss_function: str

    # Progress
    current_epoch: int
    total_epochs: int
    progress_percent: float

    # Metrics
    training_metrics: Dict[str, List[float]]
    validation_metrics: Dict[str, List[float]]

    # Resources
    gpu_enabled: bool
    num_gpus: int
    memory_mb: int

    # Logs
    logs: List[str]
    error_message: Optional[str]

    def to_dict(self):
        return asdict(self)


@dataclass
class InferenceRequest:
    """Inference request"""
    request_id: str
    model_id: str
    input_data: Any
    timestamp: str
    user_id: str

    # Configuration
    batch_size: int
    confidence_threshold: float
    max_results: int

    def to_dict(self):
        return asdict(self)


@dataclass
class InferenceResult:
    """Inference result"""
    request_id: str
    model_id: str
    predictions: List[Dict[str, Any]]
    confidence_scores: List[float]
    processing_time_ms: float
    timestamp: str

    # Metadata
    model_version: str
    input_shape: List[int]
    output_shape: List[int]

    def to_dict(self):
        return asdict(self)


@dataclass
class Dataset:
    """Dataset representation"""
    dataset_id: str
    name: str
    description: str
    dataset_type: str
    created_at: str
    created_by: str

    # Data details
    num_samples: int
    num_features: int
    num_classes: int
    data_path: str

    # Split configuration
    train_split: float
    val_split: float
    test_split: float

    # Statistics
    size_mb: float
    statistics: Dict[str, Any]

    # Labels and preprocessing
    labels: List[str]
    preprocessing_steps: List[str]

    def to_dict(self):
        return asdict(self)


@dataclass
class AutoMLConfig:
    """AutoML configuration"""
    config_id: str
    name: str
    task_type: str
    metric_to_optimize: str
    created_at: str

    # Search space
    model_types: List[str]
    hyperparameters: Dict[str, List[Any]]

    # Constraints
    max_trials: int
    max_time_minutes: int
    max_models: int

    # Current state
    trials_completed: int
    best_score: float
    best_model_id: Optional[str]

    def to_dict(self):
        return asdict(self)


class MLManager:
    """Machine Learning Integration Manager"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.data_dir = "data/ml"
        os.makedirs(self.data_dir, exist_ok=True)

        self.models: Dict[str, MLModel] = {}
        self.training_jobs: Dict[str, TrainingJob] = {}
        self.datasets: Dict[str, Dataset] = {}
        self.automl_configs: Dict[str, AutoMLConfig] = {}
        self.inference_history: List[InferenceResult] = []

        self._load_data()
        self._initialized = True

    def _load_data(self):
        """Load ML data from disk"""
        try:
            models_file = os.path.join(self.data_dir, "models.json")
            if os.path.exists(models_file):
                with open(models_file, 'r') as f:
                    data = json.load(f)
                    self.models = {k: MLModel(**v) for k, v in data.items()}

            jobs_file = os.path.join(self.data_dir, "training_jobs.json")
            if os.path.exists(jobs_file):
                with open(jobs_file, 'r') as f:
                    data = json.load(f)
                    self.training_jobs = {k: TrainingJob(**v) for k, v in data.items()}

            datasets_file = os.path.join(self.data_dir, "datasets.json")
            if os.path.exists(datasets_file):
                with open(datasets_file, 'r') as f:
                    data = json.load(f)
                    self.datasets = {k: Dataset(**v) for k, v in data.items()}
        except Exception as e:
            print(f"Error loading ML data: {e}")

    def _save_data(self):
        """Save ML data to disk"""
        try:
            models_file = os.path.join(self.data_dir, "models.json")
            with open(models_file, 'w') as f:
                json.dump({k: v.to_dict() for k, v in self.models.items()}, f, indent=2)

            jobs_file = os.path.join(self.data_dir, "training_jobs.json")
            with open(jobs_file, 'w') as f:
                json.dump({k: v.to_dict() for k, v in self.training_jobs.items()}, f, indent=2)

            datasets_file = os.path.join(self.data_dir, "datasets.json")
            with open(datasets_file, 'w') as f:
                json.dump({k: v.to_dict() for k, v in self.datasets.items()}, f, indent=2)
        except Exception as e:
            print(f"Error saving ML data: {e}")

    # Model Management
    def create_model(self, name: str, description: str, model_type: str,
                    framework: str, user_id: str, **kwargs) -> Dict:
        """Create a new ML model"""
        try:
            model_id = f"model_{secrets.token_hex(8)}"
            now = datetime.now().isoformat()

            model = MLModel(
                model_id=model_id,
                name=name,
                description=description,
                model_type=model_type,
                framework=framework,
                version="1.0.0",
                status=ModelStatus.DRAFT.value,
                created_at=now,
                updated_at=now,
                created_by=user_id,
                input_shape=kwargs.get('input_shape', []),
                output_shape=kwargs.get('output_shape', []),
                num_parameters=kwargs.get('num_parameters', 0),
                model_size_mb=kwargs.get('model_size_mb', 0.0),
                metrics={},
                training_time_seconds=0.0,
                inference_time_ms=0.0,
                is_deployed=False,
                endpoint_url=None,
                deployment_config={},
                model_path=f"models/{model_id}",
                weights_path=None,
                config_path=None,
                tags=kwargs.get('tags', []),
                metadata=kwargs.get('metadata', {})
            )

            self.models[model_id] = model
            self._save_data()

            return {
                "success": True,
                "model": model.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_model(self, model_id: str) -> Dict:
        """Get model by ID"""
        try:
            if model_id not in self.models:
                return {"success": False, "error": "Model not found"}

            return {
                "success": True,
                "model": self.models[model_id].to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_models(self, user_id: Optional[str] = None,
                   model_type: Optional[str] = None,
                   status: Optional[str] = None) -> Dict:
        """List models with filters"""
        try:
            models = list(self.models.values())

            if user_id:
                models = [m for m in models if m.created_by == user_id]
            if model_type:
                models = [m for m in models if m.model_type == model_type]
            if status:
                models = [m for m in models if m.status == status]

            return {
                "success": True,
                "models": [m.to_dict() for m in models],
                "count": len(models)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_model(self, model_id: str, **updates) -> Dict:
        """Update model details"""
        try:
            if model_id not in self.models:
                return {"success": False, "error": "Model not found"}

            model = self.models[model_id]

            # Update allowed fields
            allowed_fields = ['name', 'description', 'status', 'tags', 'metadata',
                            'metrics', 'is_deployed', 'endpoint_url', 'deployment_config']

            for field, value in updates.items():
                if field in allowed_fields:
                    setattr(model, field, value)

            model.updated_at = datetime.now().isoformat()
            self._save_data()

            return {
                "success": True,
                "model": model.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_model(self, model_id: str) -> Dict:
        """Delete a model"""
        try:
            if model_id not in self.models:
                return {"success": False, "error": "Model not found"}

            del self.models[model_id]
            self._save_data()

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Training Management
    def create_training_job(self, model_id: str, name: str, dataset_path: str,
                          user_id: str, **kwargs) -> Dict:
        """Create a training job"""
        try:
            if model_id not in self.models:
                return {"success": False, "error": "Model not found"}

            job_id = f"job_{secrets.token_hex(8)}"
            now = datetime.now().isoformat()

            job = TrainingJob(
                job_id=job_id,
                model_id=model_id,
                name=name,
                status=TrainingStatus.PENDING.value,
                created_at=now,
                started_at=None,
                completed_at=None,
                created_by=user_id,
                dataset_path=dataset_path,
                num_epochs=kwargs.get('num_epochs', 10),
                batch_size=kwargs.get('batch_size', 32),
                learning_rate=kwargs.get('learning_rate', 0.001),
                optimizer=kwargs.get('optimizer', 'adam'),
                loss_function=kwargs.get('loss_function', 'categorical_crossentropy'),
                current_epoch=0,
                total_epochs=kwargs.get('num_epochs', 10),
                progress_percent=0.0,
                training_metrics={},
                validation_metrics={},
                gpu_enabled=kwargs.get('gpu_enabled', False),
                num_gpus=kwargs.get('num_gpus', 0),
                memory_mb=kwargs.get('memory_mb', 2048),
                logs=[],
                error_message=None
            )

            self.training_jobs[job_id] = job

            # Update model status
            self.models[model_id].status = ModelStatus.TRAINING.value

            self._save_data()

            return {
                "success": True,
                "job": job.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def start_training(self, job_id: str) -> Dict:
        """Start a training job (mock implementation)"""
        try:
            if job_id not in self.training_jobs:
                return {"success": False, "error": "Job not found"}

            job = self.training_jobs[job_id]
            job.status = TrainingStatus.RUNNING.value
            job.started_at = datetime.now().isoformat()

            # Mock training progress
            import random
            job.current_epoch = 0
            job.progress_percent = 0.0

            # Mock metrics
            job.training_metrics = {
                'loss': [round(random.uniform(0.5, 2.0), 4) for _ in range(5)],
                'accuracy': [round(random.uniform(0.6, 0.95), 4) for _ in range(5)]
            }
            job.validation_metrics = {
                'loss': [round(random.uniform(0.6, 2.2), 4) for _ in range(5)],
                'accuracy': [round(random.uniform(0.55, 0.90), 4) for _ in range(5)]
            }

            job.logs.append(f"Training started at {job.started_at}")

            self._save_data()

            return {
                "success": True,
                "job": job.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_training_job(self, job_id: str) -> Dict:
        """Get training job details"""
        try:
            if job_id not in self.training_jobs:
                return {"success": False, "error": "Job not found"}

            return {
                "success": True,
                "job": self.training_jobs[job_id].to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_training_jobs(self, model_id: Optional[str] = None,
                          status: Optional[str] = None) -> Dict:
        """List training jobs"""
        try:
            jobs = list(self.training_jobs.values())

            if model_id:
                jobs = [j for j in jobs if j.model_id == model_id]
            if status:
                jobs = [j for j in jobs if j.status == status]

            return {
                "success": True,
                "jobs": [j.to_dict() for j in jobs],
                "count": len(jobs)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def stop_training(self, job_id: str) -> Dict:
        """Stop a training job"""
        try:
            if job_id not in self.training_jobs:
                return {"success": False, "error": "Job not found"}

            job = self.training_jobs[job_id]
            job.status = TrainingStatus.CANCELLED.value
            job.completed_at = datetime.now().isoformat()
            job.logs.append(f"Training stopped at {job.completed_at}")

            self._save_data()

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Inference
    def predict(self, model_id: str, input_data: Any, user_id: str, **kwargs) -> Dict:
        """Run inference on a model (mock implementation)"""
        try:
            if model_id not in self.models:
                return {"success": False, "error": "Model not found"}

            model = self.models[model_id]

            if model.status != ModelStatus.DEPLOYED.value and model.status != ModelStatus.READY.value:
                return {"success": False, "error": "Model not ready for inference"}

            request_id = f"req_{secrets.token_hex(8)}"
            now = datetime.now().isoformat()

            # Mock predictions
            import random
            num_classes = len(model.output_shape) if model.output_shape else 5
            predictions = []
            confidence_scores = []

            for i in range(min(kwargs.get('max_results', 5), 10)):
                pred = {
                    'class_id': i,
                    'class_name': f'class_{i}',
                    'probability': round(random.uniform(0.1, 0.95), 4)
                }
                predictions.append(pred)
                confidence_scores.append(pred['probability'])

            # Sort by probability
            predictions.sort(key=lambda x: x['probability'], reverse=True)
            confidence_scores.sort(reverse=True)

            result = InferenceResult(
                request_id=request_id,
                model_id=model_id,
                predictions=predictions,
                confidence_scores=confidence_scores,
                processing_time_ms=round(random.uniform(10, 100), 2),
                timestamp=now,
                model_version=model.version,
                input_shape=model.input_shape,
                output_shape=model.output_shape
            )

            self.inference_history.append(result)

            return {
                "success": True,
                "result": result.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def batch_predict(self, model_id: str, input_batch: List[Any],
                     user_id: str) -> Dict:
        """Run batch inference"""
        try:
            results = []
            for input_data in input_batch:
                result = self.predict(model_id, input_data, user_id)
                if result['success']:
                    results.append(result['result'])

            return {
                "success": True,
                "results": results,
                "count": len(results)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Dataset Management
    def create_dataset(self, name: str, description: str, dataset_type: str,
                      user_id: str, **kwargs) -> Dict:
        """Create a dataset"""
        try:
            dataset_id = f"ds_{secrets.token_hex(8)}"
            now = datetime.now().isoformat()

            dataset = Dataset(
                dataset_id=dataset_id,
                name=name,
                description=description,
                dataset_type=dataset_type,
                created_at=now,
                created_by=user_id,
                num_samples=kwargs.get('num_samples', 0),
                num_features=kwargs.get('num_features', 0),
                num_classes=kwargs.get('num_classes', 0),
                data_path=f"datasets/{dataset_id}",
                train_split=kwargs.get('train_split', 0.7),
                val_split=kwargs.get('val_split', 0.15),
                test_split=kwargs.get('test_split', 0.15),
                size_mb=kwargs.get('size_mb', 0.0),
                statistics={},
                labels=kwargs.get('labels', []),
                preprocessing_steps=kwargs.get('preprocessing_steps', [])
            )

            self.datasets[dataset_id] = dataset
            self._save_data()

            return {
                "success": True,
                "dataset": dataset.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_datasets(self, user_id: Optional[str] = None) -> Dict:
        """List datasets"""
        try:
            datasets = list(self.datasets.values())

            if user_id:
                datasets = [d for d in datasets if d.created_by == user_id]

            return {
                "success": True,
                "datasets": [d.to_dict() for d in datasets],
                "count": len(datasets)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Model Deployment
    def deploy_model(self, model_id: str, config: Dict) -> Dict:
        """Deploy a model"""
        try:
            if model_id not in self.models:
                return {"success": False, "error": "Model not found"}

            model = self.models[model_id]

            if model.status != ModelStatus.READY.value:
                return {"success": False, "error": "Model not ready for deployment"}

            # Mock deployment
            endpoint_url = f"https://api.example.com/ml/models/{model_id}/predict"

            model.status = ModelStatus.DEPLOYED.value
            model.is_deployed = True
            model.endpoint_url = endpoint_url
            model.deployment_config = config
            model.updated_at = datetime.now().isoformat()

            self._save_data()

            return {
                "success": True,
                "endpoint_url": endpoint_url,
                "model": model.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def undeploy_model(self, model_id: str) -> Dict:
        """Undeploy a model"""
        try:
            if model_id not in self.models:
                return {"success": False, "error": "Model not found"}

            model = self.models[model_id]
            model.status = ModelStatus.READY.value
            model.is_deployed = False
            model.endpoint_url = None
            model.updated_at = datetime.now().isoformat()

            self._save_data()

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # AutoML
    def create_automl_config(self, name: str, task_type: str,
                           metric_to_optimize: str, **kwargs) -> Dict:
        """Create AutoML configuration"""
        try:
            config_id = f"aml_{secrets.token_hex(8)}"
            now = datetime.now().isoformat()

            config = AutoMLConfig(
                config_id=config_id,
                name=name,
                task_type=task_type,
                metric_to_optimize=metric_to_optimize,
                created_at=now,
                model_types=kwargs.get('model_types', ['random_forest', 'xgboost', 'neural_network']),
                hyperparameters=kwargs.get('hyperparameters', {}),
                max_trials=kwargs.get('max_trials', 50),
                max_time_minutes=kwargs.get('max_time_minutes', 60),
                max_models=kwargs.get('max_models', 10),
                trials_completed=0,
                best_score=0.0,
                best_model_id=None
            )

            self.automl_configs[config_id] = config

            return {
                "success": True,
                "config": config.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def start_automl(self, config_id: str) -> Dict:
        """Start AutoML search (mock implementation)"""
        try:
            if config_id not in self.automl_configs:
                return {"success": False, "error": "Config not found"}

            config = self.automl_configs[config_id]

            # Mock AutoML run
            import random
            config.trials_completed = config.max_trials
            config.best_score = round(random.uniform(0.85, 0.95), 4)

            return {
                "success": True,
                "config": config.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Statistics
    def get_statistics(self) -> Dict:
        """Get ML statistics"""
        try:
            total_models = len(self.models)
            deployed_models = sum(1 for m in self.models.values() if m.is_deployed)
            total_jobs = len(self.training_jobs)
            running_jobs = sum(1 for j in self.training_jobs.values()
                             if j.status == TrainingStatus.RUNNING.value)
            total_datasets = len(self.datasets)
            total_predictions = len(self.inference_history)

            # Framework distribution
            framework_dist = {}
            for model in self.models.values():
                framework_dist[model.framework] = framework_dist.get(model.framework, 0) + 1

            # Model type distribution
            type_dist = {}
            for model in self.models.values():
                type_dist[model.model_type] = type_dist.get(model.model_type, 0) + 1

            # Average metrics
            avg_accuracy = 0.0
            model_count = 0
            for model in self.models.values():
                if 'accuracy' in model.metrics:
                    avg_accuracy += model.metrics['accuracy']
                    model_count += 1

            if model_count > 0:
                avg_accuracy = round(avg_accuracy / model_count, 4)

            return {
                "success": True,
                "statistics": {
                    "total_models": total_models,
                    "deployed_models": deployed_models,
                    "total_training_jobs": total_jobs,
                    "running_jobs": running_jobs,
                    "total_datasets": total_datasets,
                    "total_predictions": total_predictions,
                    "framework_distribution": framework_dist,
                    "type_distribution": type_dist,
                    "average_accuracy": avg_accuracy
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
ml_manager = MLManager()
