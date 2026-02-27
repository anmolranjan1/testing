import { AlertCircle } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

/**
 * Placeholder component for pages under development
 */
export default function PlaceholderPage({
  title,
  description = "This feature is under development and will be available soon.",
}: PlaceholderPageProps) {
  return (
    <div className="container-fluid p-4">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <AlertCircle size={64} className="text-primary mb-3" />
              <h2 className="mb-3">{title}</h2>
              <p className="text-muted mb-0">{description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
