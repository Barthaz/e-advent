import { useState, useEffect, useCallback } from 'react';
import examplesData from '../data/examples.json';
import { buildCalendarTasks, validateExampleSetsCoverage } from '../utils/calendarGenerator';
import type { CalendarFormat, CalendarTaskInput, DesignSelection, ProductType } from '../types/order';
import {
  loadFormData,
  loadTasks,
  loadSelectedExamples,
  saveFormData,
  saveTasks,
  saveSelectedExamples,
  saveGeneratedCalendar,
  loadDesign,
  saveDesign,
  loadFormat,
  saveFormat,
  setActiveProduct,
  getStorageKeys,
} from '../utils/creatorStorage';
import { getSkuForTypeAndFormat } from '../config/products';

interface ExampleSet {
  title: string;
  description: string;
  tasks: string[];
}

export interface UseCreatorWizardOptions {
  productType: ProductType;
  steps: string[];
  requiresDesign?: boolean;
}

export function useCreatorWizard({ productType, steps, requiresDesign = false }: UseCreatorWizardOptions) {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [calendarTitle, setCalendarTitle] = useState('Mój Kalendarz Adwentowy');
  const [dailyEmailReminders, setDailyEmailReminders] = useState(false);
  const [tasks, setTasks] = useState<CalendarTaskInput[]>([]);
  const [selectedExampleSets, setSelectedExampleSets] = useState<number[]>([]);
  const [format, setFormatState] = useState<CalendarFormat>('A4');
  const [design, setDesignState] = useState<DesignSelection | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const examples = examplesData as ExampleSet[];

  useEffect(() => {
    const form = loadFormData(productType);
    if (form.name) setName(form.name);
    if (form.email) setEmail(form.email);
    if (form.calendarTitle) setCalendarTitle(form.calendarTitle);
    if (form.dailyEmailReminders !== undefined) setDailyEmailReminders(form.dailyEmailReminders);
    setTasks(loadTasks(productType));
    setSelectedExampleSets(loadSelectedExamples(productType));
    if (requiresDesign) {
      const savedFormat = loadFormat(productType);
      if (savedFormat) setFormatState(savedFormat);
      const savedDesign = loadDesign(productType);
      if (savedDesign) setDesignState(savedDesign);
    }
    setIsInitialLoad(false);
  }, [productType, requiresDesign]);

  useEffect(() => {
    if (isInitialLoad) return;
    saveFormData(productType, { name, email, calendarTitle, dailyEmailReminders });
  }, [name, email, calendarTitle, dailyEmailReminders, productType, isInitialLoad]);

  useEffect(() => {
    if (isInitialLoad) return;
    saveTasks(productType, tasks);
  }, [tasks, productType, isInitialLoad]);

  useEffect(() => {
    if (isInitialLoad) return;
    saveSelectedExamples(productType, selectedExampleSets);
  }, [selectedExampleSets, productType, isInitialLoad]);

  useEffect(() => {
    if (isInitialLoad) return;
    if (requiresDesign) saveFormat(productType, format);
  }, [format, productType, requiresDesign, isInitialLoad]);

  useEffect(() => {
    if (isInitialLoad) return;
    if (requiresDesign && design) saveDesign(productType, design);
  }, [design, productType, requiresDesign, isInitialLoad]);

  useEffect(() => {
    if (isInitialLoad) return;
    if (selectedExampleSets.length === 0 && tasks.length < 24) return;

    const preview = buildCalendarTasks(tasks, examples, selectedExampleSets);
    saveGeneratedCalendar(productType, preview);
  }, [tasks, selectedExampleSets, isInitialLoad, examples, productType]);

  const validateBasicStep = useCallback(() => {
    if (!name.trim() || !email.trim()) {
      setValidationError('Proszę wypełnić wszystkie wymagane pola');
      return false;
    }
    setValidationError(null);
    return true;
  }, [name, email]);

  const validateTasksStep = useCallback(() => {
    const validation = validateExampleSetsCoverage(tasks, examples, selectedExampleSets);
    if (!validation.valid) {
      setValidationError(validation.error || 'Nie można wygenerować kalendarza.');
      return false;
    }
    setValidationError(null);
    return true;
  }, [tasks, selectedExampleSets, examples]);

  const validateDesignStep = useCallback(() => {
    if (!design?.imageUrl) {
      setValidationError('Wybierz grafikę z galerii lub prześlij własną.');
      return false;
    }
    setValidationError(null);
    return true;
  }, [design]);

  const goNext = useCallback(() => {
    const stepId = steps[currentStep];
    if (stepId === 'basic' && !validateBasicStep()) return;
    if (stepId === 'tasks' && !validateTasksStep()) return;
    if (stepId === 'design' && !validateDesignStep()) return;
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }, [currentStep, steps, validateBasicStep, validateTasksStep, validateDesignStep]);

  const goBack = useCallback(() => {
    setValidationError(null);
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const getSku = useCallback(() => {
    if (productType === 'interactive') return 'interactive';
    return getSkuForTypeAndFormat(productType, format) || 'interactive';
  }, [productType, format]);

  const prepareCheckoutData = useCallback(() => {
    const sku = getSku();
    setActiveProduct(productType, sku);
    const keys = getStorageKeys(productType);
    const data = {
      name,
      email,
      calendarTitle,
      tasks,
      dailyEmailReminders,
      selectedExampleSets,
      productType,
      sku,
      format: productType !== 'interactive' ? format : undefined,
      design: design || undefined,
    };
    localStorage.setItem(keys.calendarData, JSON.stringify(data));
    localStorage.setItem('calendarData', JSON.stringify(data));
    localStorage.setItem('e-advent-product-type', productType);
    localStorage.setItem('e-advent-sku', sku);
    return data;
  }, [name, email, calendarTitle, tasks, dailyEmailReminders, selectedExampleSets, productType, format, design, getSku]);

  return {
    currentStep,
    steps,
    name,
    setName,
    email,
    setEmail,
    calendarTitle,
    setCalendarTitle,
    dailyEmailReminders,
    setDailyEmailReminders,
    tasks,
    setTasks,
    selectedExampleSets,
    setSelectedExampleSets,
    format,
    setFormat: setFormatState,
    design,
    setDesign: setDesignState,
    validationError,
    setValidationError,
    examples,
    productType,
    goNext,
    goBack,
    getSku,
    prepareCheckoutData,
    validateBasicStep,
    validateTasksStep,
    validateDesignStep,
  };
}
