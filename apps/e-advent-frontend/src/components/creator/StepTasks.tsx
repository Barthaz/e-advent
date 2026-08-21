import { useState } from 'react';
import FormField from '../FormField';
import type { CalendarTaskInput } from '../../types/order';

interface ExampleSet {
  title: string;
  description: string;
  tasks: string[];
}

interface StepTasksProps {
  tasks: CalendarTaskInput[];
  setTasks: (tasks: CalendarTaskInput[]) => void;
  selectedExampleSets: number[];
  setSelectedExampleSets: (indices: number[]) => void;
  examples: ExampleSet[];
  validationError: string | null;
  setValidationError: (error: string | null) => void;
  productType: string;
}

export default function StepTasks({
  tasks,
  setTasks,
  selectedExampleSets,
  setSelectedExampleSets,
  examples,
  validationError,
  setValidationError,
  productType,
}: StepTasksProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('');
  const [newTaskLockedDay, setNewTaskLockedDay] = useState('');
  const [newTaskLatestDay, setNewTaskLatestDay] = useState('');

  const addTask = () => {
    setValidationError(null);
    if (!newTaskText.trim()) {
      setValidationError('Proszę wprowadzić treść zadania');
      return;
    }
    const duration = newTaskDuration ? parseInt(newTaskDuration) : undefined;
    const lockedDay = newTaskLockedDay ? parseInt(newTaskLockedDay) : undefined;
    const latestDay = newTaskLatestDay ? parseInt(newTaskLatestDay) : undefined;

    if (lockedDay !== undefined && (lockedDay < 1 || lockedDay > 24)) {
      setValidationError('Dzień zablokowany musi być między 1 a 24');
      return;
    }
    if (latestDay !== undefined && (latestDay < 1 || latestDay > 24)) {
      setValidationError('Najpóźniejszy dzień musi być między 1 a 24');
      return;
    }
    if (lockedDay !== undefined && latestDay !== undefined && latestDay < lockedDay) {
      setValidationError('Najpóźniejszy dzień nie może być wcześniejszy niż dzień zablokowany');
      return;
    }

    const taskData: CalendarTaskInput = {
      task: newTaskText,
      ...(duration && duration > 0 ? { duration } : {}),
      ...(lockedDay !== undefined ? { lockedDay } : {}),
      ...(latestDay !== undefined ? { latestDay } : {}),
    };
    setTasks([...tasks, taskData]);
    setNewTaskText('');
    setNewTaskDuration('');
    setNewTaskLockedDay('');
    setNewTaskLatestDay('');
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const openPreview = () => {
    if (tasks.length < 24 && selectedExampleSets.length === 0) {
      setValidationError('Musisz mieć 24 własne zadania LUB wybrać co najmniej jedną kategorię zadań.');
      return;
    }
    import('../../utils/previewLayout').then(({ generatePreviewLayout }) => {
      const previewLayout = generatePreviewLayout();
      localStorage.setItem('calendarPreview', JSON.stringify({
        name: '', email: '', calendarTitle: '', tasks, dailyEmailReminders: false,
        dates: [], previewLayout, selectedExampleSets, productType,
      }));
      localStorage.removeItem('calendarPreview_openedDays');
      window.open('/preview', '_blank');
    });
  };

  return (
    <section>
      <h2 className="heading-section mb-4">Zadania</h2>

      <div className="notice-cream">
        <h3 className="text-lg font-semibold text-parchment-text mb-3">
          <i className="fas fa-layer-group text-christmas-green mr-2" />
          Wybierz zestawy zadań do losowania
        </h3>
        <p className="text-parchment-muted text-sm mb-4">
          Wybierz świąteczne kolekcje zadań. Możesz połączyć kilka — losowanie obejmie wszystkie wybrane zestawy.
        </p>
        <div className="space-y-3">
          {examples.map((exampleSet, index) => (
            <label
              key={index}
              className={`option-card ${
                selectedExampleSets.includes(index) ? 'option-card--selected' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedExampleSets.includes(index)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedExampleSets([...selectedExampleSets, index]);
                  } else {
                    setSelectedExampleSets(selectedExampleSets.filter((i) => i !== index));
                  }
                }}
              />
              <div className="flex-1">
                <div className="font-semibold text-parchment-text mb-1">{exampleSet.title}</div>
                <div className="text-sm text-parchment-muted">{exampleSet.description}</div>
                <div className="text-xs text-parchment-muted mt-1">
                  <i className="fas fa-tasks mr-1" />
                  {exampleSet.tasks.length} zadań w zestawie
                </div>
              </div>
            </label>
          ))}
        </div>
        {selectedExampleSets.length === 0 && tasks.length < 24 && (
          <div className="mt-3 text-red-600 text-sm font-medium">
            <i className="fas fa-exclamation-triangle mr-2" />
            Musisz wybrać co najmniej jedną kategorię, ponieważ masz mniej niż 24 własne zadania.
          </div>
        )}
      </div>

      <div className="alert-info mb-4">
        <p className="text-parchment-text font-medium mb-2">
          <i className="fas fa-info-circle text-christmas-green mr-2" />
          Możesz też dodać własne zadania
        </p>
        <p className="text-parchment-muted text-sm">
          Dodaj własne zadania lub zablokuj je na konkretnym dniu grudnia.
        </p>
      </div>

      <div className="creator-form-well">
        <FormField label="Treść zadania *" value={newTaskText} onChange={(v) => { setNewTaskText(v); setValidationError(null); }} placeholder="np. Upiecz pierniki" maxLength={200} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 mt-4">
          <FormField label="Czas realizacji (dni)" type="number" value={newTaskDuration} onChange={setNewTaskDuration} placeholder="np. 2" />
          <FormField label="Zablokuj dzień (1-24)" type="number" value={newTaskLockedDay} onChange={setNewTaskLockedDay} placeholder="np. 6" min={1} max={24} />
          <FormField label="Najpóźniej do dnia (1-24)" type="number" value={newTaskLatestDay} onChange={setNewTaskLatestDay} placeholder="np. 10" min={1} max={24} />
        </div>
        {validationError && (
          <div className="alert-error mb-4"><p className="font-medium">{validationError}</p></div>
        )}
        <button onClick={addTask} disabled={tasks.length >= 24} className={`btn-sm-green ${tasks.length >= 24 ? 'btn-disabled' : ''}`}>
          <i className="fas fa-plus mr-2" />
          {tasks.length >= 24 ? 'Osiągnięto limit 24 zadań' : 'Dodaj zadanie'}
        </button>
      </div>

      {tasks.length > 0 && (
        <div className="space-y-2 mb-4">
          <h3 className="font-medium text-parchment-text">Dodane zadania ({tasks.length}):</h3>
          {tasks.map((task, index) => (
            <div key={index} className="task-list-item">
              <div className="flex-1">
                <span className="font-medium text-christmas-green">#{index + 1}:</span>{' '}
                <span className="text-parchment-text">{task.task}</span>
              </div>
              <button onClick={() => removeTask(index)} className="text-parchment-muted hover:text-christmas-red font-bold ml-4 text-xl">×</button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={openPreview}
        disabled={tasks.length < 24 && selectedExampleSets.length === 0}
        className={`btn-preview w-full ${tasks.length < 24 && selectedExampleSets.length === 0 ? 'btn-disabled' : ''}`}
      >
        <i className="fas fa-eye mr-2" />
        Podgląd zadań
      </button>
    </section>
  );
}
