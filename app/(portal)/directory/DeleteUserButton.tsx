"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({ userId }: { userId: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this employee? This action is irreversible.")) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                alert("Employee deleted successfully.");
                router.refresh();
            } else {
                const errorText = await res.text();
                alert(`Failed to delete employee: ${errorText}`);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while deleting the user.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button 
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
                background: "rgba(255, 69, 58, 0.1)",
                color: "#ff453a",
                border: "1px solid rgba(255, 69, 58, 0.2)",
                borderRadius: "var(--radius-full)",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isDeleting ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
            }}
            title="Delete Employee"
        >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
    );
}
