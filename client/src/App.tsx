import SimpleApp from "./simple-app";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SimpleApp />
    </QueryClientProvider>
  );
}

export default App;
