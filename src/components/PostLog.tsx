import React from 'react';
import { LogEntry } from '../types';

interface PostLogProps {
  entries: LogEntry[];
}

const PostLog: React.FC<PostLogProps> = ({ entries }) => {
  return (
    <div className="post-log">
      <h3>Webhooks</h3>
      <div className="log-entries">
        {entries.length === 0 ? (
          <p className="no-entries">No webhook posts received yet</p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`log-entry ${entry.isCorrect ? 'correct' : ''}`}
            >
              <div className="timestamp">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
              <div className="payload">
                {entry.payload.transcription && (
                  <div className="transcription">
                    Transcription: "{entry.payload.transcription}"
                  </div>
                )}
                <div className="answer">
                  Answer received: {entry.payload.answer ?? entry.payload.number}
                </div>
                {entry.payload._effectRun && (
                  <div className="debug-info" style={{fontSize: '10px', color: '#999'}}>
                    Effect run: {entry.payload._effectRun}<br/>
                    Message timestamp: {entry.payload._messageTimestamp}
                  </div>
                )}
              </div>
              {entry.isCorrect !== undefined && (
                <div className="status">
                  {entry.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PostLog;
