import { useState } from 'react';
import FormField from '../FormField';
import type { CalendarTaskInput, ScratchContentMode } from '../../types/order';
import type { ScratchPreset } from '../../utils/scratchCalendarGenerator';

interface StepScratchTasksProps {
  presets: ScratchPreset[];
  mode: ScratchContentMode;
  setMode: (mode: ScratchContentMode) => void;
  selectedPreset: number | null;
  setSelectedPreset: (index: number | null) => void;
  tasks: CalendarTaskInput[];
  setTasks: (tasks: CalendarTaskInput[]) => void;
  shuffleCustomTasks: boolean;
  setShuffleCustomTasks: (value: boolean) => void;
  validationError: string | null;
  setValidationError: (error: string | null) => void;
  tone?: 'parchment' | 'onDark';
  hideIntro?: boolean;
}

export default function StepScratchTasks({
  presets,
  mode,
  setMode,
  selectedPreset,
  setSelectedPreset,
  tasks,
  setTasks,
  shuffleCustomTasks,
  setShuffleCustomTasks,
  validationError,
  setValidationError,
  tone = 'parchment',
  hideIntro = false,
}: StepScratchTasksProps) {
  const onDark = tone === 'onDark';
  const optionClass = (selected: boolean, layout: 'col' | 'row' = 'col') =>
    [
      'option-card',
      onDark ? 'option-card--on-dark' : '',
      layout === 'col' ? 'flex-col gap-0' : '',
      selected ? 'option-card--selected' : '',
    ].filter(Boolean).join(' ');
  const titleClass = onDark ? 'font-semibold text-christmas-gold-light mb-1' : 'font-semibold text-parchment-text mb-1';
  const mutedClass = onDark ? 'text-sm text-white/65' : 'text-sm text-parchment-muted';
  const xsMutedClass = onDark ? 'text-xs text-white/45 mt-1' : 'text-xs text-parchment-muted mt-1';
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [expandedPreset, setExpandedPreset] = useState<number | null>(null);

  const selectPreset = (index: number) => {
    setValidationError(null);
    setMode('preset');
    setSelectedPreset(index);
    setTasks([]);
  };

  const selectCustom = () => {
    setValidationError(null);
    setMode('custom');
    setSelectedPreset(null);
    setExpandedPreset(null);
  };

  const addTask = () => {
    setValidationError(null);
    if (!newDescription.trim()) {
      setValidationError('Proszę wprowadzić treść zadania');
      return;
    }
    if (tasks.length >= 24) {
      setValidationError('Maksymalnie 24 zadania');
      return;
    }
    const taskData: CalendarTaskInput = {
      task: newDescription.trim(),
      ...(newTitle.trim() ? { title: newTitle.trim() } : {}),
    };
    setTasks([...tasks, taskData]);
    setNewTitle('');
    setNewDescription('');
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const customSelected = mode === 'custom';

  return (
    <section>
      {!hideIntro && (
        <>
          <h2 className="heading-section mb-2">Treść kalendarza</h2>
          <p className="text-parchment-muted text-sm mb-6">
            Wybierz gotową świąteczną przygodę albo ułóż własną — proste wyzwania pod okienka zdrapki.
          </p>
        </>
      )}

      <div className={onDark ? 'mb-2' : 'notice-cream mb-6'}>
        {!hideIntro && (
          <>
            <h3 className="text-lg font-semibold text-parchment-text mb-2">
              <i className="fas fa-star text-christmas-green mr-2" />
              Wybierz swoją świąteczną przygodę
            </h3>
            <p className="text-parchment-muted text-sm mb-4">
              Trzy gotowe historie (24 dni w ustalonej kolejności) albo stwórz własną przygodę od zera.
            </p>
          </>
        )}

        <div className="space-y-3">
          {presets.map((preset, index) => {
            const selected = mode === 'preset' && selectedPreset === index;
            const isExpanded = expandedPreset === index;
            return (
              <div
                key={preset.name}
                className={optionClass(selected)}
              >
                <div className="flex items-start gap-3 w-full">
                  <label className="flex gap-3 cursor-pointer flex-1 min-w-0">
                    <input
                      type="radio"
                      name="scratch-adventure"
                      checked={selected}
                      onChange={() => selectPreset(index)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={titleClass}>{preset.name}</div>
                      <div className={mutedClass}>{preset.shortDescription}</div>
                      <div className={xsMutedClass}>
                        <i className="fas fa-calendar-day mr-1" />
                        24 dni · stała kolejność
                      </div>
                    </div>
                  </label>

                  <button
                    type="button"
                    className={`scratch-expand-btn ${isExpanded ? 'scratch-expand-btn--open' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedPreset(isExpanded ? null : index);
                    }}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Ukryj opis' : 'Pokaż więcej'}
                    title={isExpanded ? 'Ukryj opis' : 'Pokaż więcej'}
                  >
                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                  </button>
                </div>

                {isExpanded && (
                  <p className={`scratch-adventure-more ${onDark ? 'scratch-adventure-more--on-dark' : ''}`}>
                    {preset.fullDescription}
                  </p>
                )}
              </div>
            );
          })}

          <label
            className={optionClass(customSelected, 'row')}
          >
            <input
              type="radio"
              name="scratch-adventure"
              checked={customSelected}
              onChange={selectCustom}
            />
            <div className="flex-1 min-w-0">
              <div className={titleClass}>
                Stwórz własną przygodę świąteczną
              </div>
              <div className={mutedClass}>
                Do 24 własnych wyzwań — opcjonalny tytuł dnia i treść. Na końcu wybierzesz kolejność
                albo przetasowanie.
              </div>
            </div>
          </label>
        </div>
      </div>

      {customSelected && (
        <>
          <div className="creator-form-well">
            <FormField
              label="Tytuł dnia (opcjonalnie)"
              value={newTitle}
              onChange={(v) => {
                setNewTitle(v);
                setValidationError(null);
              }}
              placeholder="np. Wieczór kakao"
              maxLength={80}
            />
            <div className="mt-4">
              <FormField
                label="Treść zadania *"
                value={newDescription}
                onChange={(v) => {
                  setNewDescription(v);
                  setValidationError(null);
                }}
                placeholder="np. Przygotujcie kakao i wybierzcie ulubione dodatki"
                maxLength={200}
              />
            </div>
            {validationError && (
              <div className="alert-error mb-4 mt-4">
                <p className="font-medium">{validationError}</p>
              </div>
            )}
            <button
              type="button"
              onClick={addTask}
              disabled={tasks.length >= 24}
              className={`btn-sm-green mt-4 ${tasks.length >= 24 ? 'btn-disabled' : ''}`}
            >
              <i className="fas fa-plus mr-2" />
              {tasks.length >= 24 ? 'Osiągnięto limit 24 zadań' : 'Dodaj zadanie'}
            </button>
          </div>

          {tasks.length > 0 && (
            <div className="space-y-2 mb-4 mt-4">
              <h3 className={onDark ? 'font-medium text-christmas-gold-light' : 'font-medium text-parchment-text'}>
                Twoje zadania ({tasks.length}/24):
              </h3>
              {tasks.map((task, index) => (
                <div key={index} className={onDark ? 'task-list-item task-list-item--on-dark' : 'task-list-item'}>
                  <div className="flex-1 min-w-0">
                    <span className={onDark ? 'font-medium text-christmas-gold' : 'font-medium text-christmas-green'}>#{index + 1}</span>
                    {task.title ? (
                      <>
                        <span className={`font-semibold ml-2 ${onDark ? 'text-white' : 'text-parchment-text'}`}>{task.title}</span>
                        <span className={onDark ? 'text-white/65' : 'text-parchment-muted'}> — {task.task}</span>
                      </>
                    ) : (
                      <span className={`ml-2 ${onDark ? 'text-white/90' : 'text-parchment-text'}`}>{task.task}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    className="text-parchment-muted hover:text-christmas-red font-bold ml-4 text-xl"
                    aria-label="Usuń zadanie"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={onDark ? 'mt-4' : 'notice-cream mt-4'}>
            <h3 className={onDark ? 'font-semibold text-christmas-gold-light mb-3' : 'font-semibold text-parchment-text mb-3'}>Kolejność na kalendarzu</h3>
            <div className="space-y-2">
              <label className={optionClass(!shuffleCustomTasks, 'row')}>
                <input
                  type="radio"
                  name="scratch-shuffle"
                  checked={!shuffleCustomTasks}
                  onChange={() => setShuffleCustomTasks(false)}
                />
                <div>
                  <div className={onDark ? 'font-medium text-christmas-gold-light' : 'font-medium text-parchment-text'}>Zachowaj kolejność</div>
                  <div className={mutedClass}>
                    Zadanie #1 trafi na dzień 1, #2 na dzień 2 itd.
                  </div>
                </div>
              </label>
              <label className={optionClass(shuffleCustomTasks, 'row')}>
                <input
                  type="radio"
                  name="scratch-shuffle"
                  checked={shuffleCustomTasks}
                  onChange={() => setShuffleCustomTasks(true)}
                />
                <div>
                  <div className={onDark ? 'font-medium text-christmas-gold-light' : 'font-medium text-parchment-text'}>Przetasuj zadania</div>
                  <div className={mutedClass}>
                    Ta sama lista, ale w losowej kolejności na okienkach.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </>
      )}

      {mode === 'preset' && validationError && (
        <div className="alert-error mt-4">
          <p className="font-medium">{validationError}</p>
        </div>
      )}
    </section>
  );
}
