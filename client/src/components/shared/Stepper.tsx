import React from 'react';
import { Check, Clock, AlertCircle, Circle } from 'lucide-react';

export interface StepperStep {
  key: string;
  label: string;
  icon?: React.ElementType;
  description?: string;
  timestamp?: string;
  actor?: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: string;
  completedSteps?: string[];
  skippedSteps?: string[];
  exceptionStep?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

export function Stepper({ 
  steps, 
  currentStep, 
  completedSteps = [], 
  skippedSteps = [],
  exceptionStep,
  orientation = 'horizontal',
  size = 'md'
}: StepperProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  const isException = !!exceptionStep;

  const getStepStatus = (step: StepperStep, index: number): 'completed' | 'current' | 'pending' | 'skipped' | 'exception' => {
    if (step.key === exceptionStep) return 'exception';
    if (completedSteps.includes(step.key)) return 'completed';
    if (skippedSteps.includes(step.key)) return 'skipped';
    if (step.key === currentStep) return 'current';
    if (currentIndex >= 0 && index < currentIndex) return 'completed';
    return 'pending';
  };

  const statusStyles = {
    completed: { bg: '#22c55e', border: '#22c55e', text: '#fff', line: '#22c55e' },
    current: { bg: '#3b82f6', border: '#3b82f6', text: '#fff', line: 'var(--border)' },
    pending: { bg: 'var(--bg-primary)', border: 'var(--border)', text: 'var(--text-muted)', line: 'var(--border)' },
    skipped: { bg: 'var(--bg-tertiary)', border: 'var(--border)', text: 'var(--text-muted)', line: 'var(--border)' },
    exception: { bg: '#ef4444', border: '#ef4444', text: '#fff', line: '#ef4444' },
  };

  const sizeConfig = {
    sm: { iconSize: 24, fontSize: '0.625rem', gap: '0.5rem' },
    md: { iconSize: 32, fontSize: '0.75rem', gap: '0.75rem' },
    lg: { iconSize: 40, fontSize: '0.875rem', gap: '1rem' },
  };

  const config = sizeConfig[size];

  if (orientation === 'vertical') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          const styles = statusStyles[status];
          const StepIcon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: config.iconSize,
                  height: config.iconSize,
                  borderRadius: '50%',
                  backgroundColor: styles.bg,
                  border: `2px solid ${styles.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: styles.text,
                  flexShrink: 0,
                }}>
                  {status === 'completed' && <Check size={config.iconSize * 0.5} />}
                  {status === 'exception' && <AlertCircle size={config.iconSize * 0.5} />}
                  {status === 'current' && (StepIcon ? <StepIcon size={config.iconSize * 0.5} /> : <Circle size={config.iconSize * 0.4} fill="currentColor" />)}
                  {(status === 'pending' || status === 'skipped') && (StepIcon ? <StepIcon size={config.iconSize * 0.5} /> : <Circle size={config.iconSize * 0.3} />)}
                </div>
                {!isLast && (
                  <div style={{
                    width: '2px',
                    flex: 1,
                    minHeight: '2rem',
                    backgroundColor: status === 'completed' ? styles.line : 'var(--border)',
                  }} />
                )}
              </div>
              <div style={{ paddingBottom: isLast ? 0 : '1.5rem', paddingTop: '0.25rem' }}>
                <div style={{ fontSize: config.fontSize, fontWeight: 600, color: status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {step.label}
                </div>
                {step.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {step.description}
                  </div>
                )}
                {step.timestamp && (
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={10} /> {step.timestamp}
                    {step.actor && <span> by {step.actor}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: config.iconSize / 2, 
        left: config.iconSize, 
        right: config.iconSize, 
        height: '2px', 
        backgroundColor: 'var(--border)',
        zIndex: 0 
      }} />
      {steps.map((step, index) => {
        const status = getStepStatus(step, index);
        const styles = statusStyles[status];
        const StepIcon = step.icon;

        return (
          <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
            <div style={{
              width: config.iconSize,
              height: config.iconSize,
              borderRadius: '50%',
              backgroundColor: styles.bg,
              border: `2px solid ${styles.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: styles.text,
            }}>
              {status === 'completed' && <Check size={config.iconSize * 0.5} />}
              {status === 'exception' && <AlertCircle size={config.iconSize * 0.5} />}
              {status === 'current' && (StepIcon ? <StepIcon size={config.iconSize * 0.5} /> : <Circle size={config.iconSize * 0.4} fill="currentColor" />)}
              {(status === 'pending' || status === 'skipped') && (StepIcon ? <StepIcon size={config.iconSize * 0.5} /> : <span style={{ fontSize: config.fontSize }}>{index + 1}</span>)}
            </div>
            <div style={{ marginTop: config.gap, textAlign: 'center' }}>
              <div style={{ 
                fontSize: config.fontSize, 
                fontWeight: status === 'current' ? 600 : 500, 
                color: status === 'pending' || status === 'skipped' ? 'var(--text-muted)' : 'var(--text-primary)'
              }}>
                {step.label}
              </div>
              {step.timestamp && (
                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  {step.timestamp}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Stepper;
