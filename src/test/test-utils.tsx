import { type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnitsProvider } from '@/context/UnitsContext';
import { TimezoneProvider } from '@/context/TimezoneContext';
import { ShareProvider } from '@/context/ShareContext';

/**
 * Wraps children in all app providers (Units, Timezone, Share, Router).
 * Pass `routerProps` to configure MemoryRouter initial entries.
 */
export function AllProviders({
  children,
  initialEntries = ['/'],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  return (
    <UnitsProvider>
      <TimezoneProvider>
        <ShareProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </ShareProvider>
      </TimezoneProvider>
    </UnitsProvider>
  );
}

/**
 * Custom render that wraps component with all providers.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    ...renderOptions
  }: RenderOptions & { initialEntries?: string[] } = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
    );
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export { render };
