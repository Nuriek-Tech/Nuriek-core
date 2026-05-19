import "./loading.css";

export default function PortalLoading() {
    return (
        <div className="portalLoading" role="status" aria-label="Loading page">
            <div className="portalLoadingSpinner" />
        </div>
    );
}
