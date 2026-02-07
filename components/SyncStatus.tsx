import React from "react";

interface SyncStatusProps {
  status: {
    message: string;
    type: "info" | "success" | "error";
  } | null;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ status }) => {
  if (!status) {
    return null;
  }

  const getMessageClass = () => {
    switch (status.type) {
      case "success":
        return "message message-success";
      case "error":
        return "message message-error";
      case "info":
      default:
        return "message message-info";
    }
  };

  return (
    <div className={getMessageClass()}>
      {status.message}
    </div>
  );
};

export default SyncStatus;