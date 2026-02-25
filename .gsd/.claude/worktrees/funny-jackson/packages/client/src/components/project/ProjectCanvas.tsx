import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { WidgetRegistry } from '../widgets/WidgetRegistry';
import { WidgetContainer } from './WidgetContainer';
import { WidgetLibrarySidebar } from './WidgetLibrarySidebar';
import { WidgetErrorBoundary } from '../ui/ErrorBoundary';
import { useProjectPermission } from '../../hooks/usePermission';
import { useUIStore } from '../../stores/ui.store';

interface ProjectCanvasProps {
  projectId: string;
}

export function ProjectCanvas({ projectId }: ProjectCanvasProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const { isOwner } = useProjectPermission(projectId);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ['widgets', projectId],
    queryFn: () => projectsApi.getWidgets(projectId),
  });

  const addWidgetMutation = useMutation({
    mutationFn: (data: { type: string; title: string; width: number; height: number }) =>
      projectsApi.addWidget(projectId, {
        type: data.type,
        title: data.title,
        width: data.width,
        height: data.height,
        positionX: 0,
        positionY: widgets.length * 10,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets', projectId] });
      addToast({ type: 'success', message: 'Widget added' });
      setLibraryOpen(false);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to add widget' });
    },
  });

  const removeWidgetMutation = useMutation({
    mutationFn: (widgetId: string) => projectsApi.deleteWidget(projectId, widgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets', projectId] });
      addToast({ type: 'success', message: 'Widget removed' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to remove widget' });
    },
  });

  const resizeWidgetMutation = useMutation({
    mutationFn: ({ widgetId, width, height }: { widgetId: string; width: number; height: number }) =>
      projectsApi.updateWidget(projectId, widgetId, { width, height }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets', projectId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to resize widget' });
    },
  });

  const handleAddWidget = useCallback(
    (type: string, title: string, width: number, height: number) => {
      addWidgetMutation.mutate({ type, title, width, height });
    },
    [addWidgetMutation]
  );

  const canvasStyle: React.CSSProperties = {
    flex: 1,
    padding: '20px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    minHeight: '400px',
  };

  const emptyCanvasStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    minHeight: '400px',
    border: '2px dashed var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    margin: '20px',
    padding: '40px',
  };

  const addBtnStyle: React.CSSProperties = {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  };

  if (isLoading) {
    return (
      <div style={{ ...emptyCanvasStyle, border: 'none' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <>
        <div style={emptyCanvasStyle}>
          <div style={{ fontSize: '48px', opacity: 0.3 }}>+</div>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Blank Canvas
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              maxWidth: '300px',
              margin: 0,
            }}
          >
            Start by adding widgets from the library. Choose from Kanban boards, task lists,
            timelines, and more.
          </p>
          {isOwner && (
            <button
              style={addBtnStyle}
              onClick={() => setLibraryOpen(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              }}
            >
              Add Widget
            </button>
          )}
        </div>
        <WidgetLibrarySidebar
          isOpen={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onAddWidget={handleAddWidget}
        />
      </>
    );
  }

  return (
    <>
      {isOwner && (
        <div style={{ padding: '12px 20px 0' }}>
          <button
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              backgroundColor: 'transparent',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              transition: 'all var(--transition-fast)',
            }}
            onClick={() => setLibraryOpen(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            + Add Widget
          </button>
        </div>
      )}

      <div style={canvasStyle}>
        {widgets.map((widget) => {
          const WidgetComponent = WidgetRegistry[widget.type];
          if (!WidgetComponent) return null;

          return (
            <WidgetContainer
              key={widget.id}
              id={widget.id}
              projectId={projectId}
              title={widget.title}
              width={widget.width}
              height={widget.height}
              onRemove={() => removeWidgetMutation.mutate(widget.id)}
              onResize={(w, h) => resizeWidgetMutation.mutate({ widgetId: widget.id, width: w, height: h })}
            >
              <WidgetErrorBoundary widgetTitle={widget.title}>
                <WidgetComponent
                  projectId={projectId}
                  widgetId={widget.id}
                  config={widget.configJson as Record<string, unknown>}
                />
              </WidgetErrorBoundary>
            </WidgetContainer>
          );
        })}
      </div>

      <WidgetLibrarySidebar
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </>
  );
}
