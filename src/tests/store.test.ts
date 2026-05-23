import { describe, it, expect, beforeEach } from "vitest";
import { useJobStore } from "../store/jobStore";
import type { FileState, Preset } from "../types/conversion";


let _idCounter = 0;
function uid(): string {
  return `test-id-${_idCounter++}`;
}

function makeFile(path: string, detectedFormat: FileState["detectedFormat"] = "jpeg"): FileState {
  return {
    id: uid(),
    path,
    name: path.split("/").pop() ?? path,
    size: 1024,
    detectedFormat,
    conversions: {},
    targets: [],
  };
}


beforeEach(() => {
  useJobStore.setState({
    files: [],
    toasts: [],
    activeJobId: null,
    pendingBatchJobs: 0,
    view: "drop",
    panel: "convert",
  });
});


describe("addFiles", () => {
  it("adds new files and switches to list view", () => {
    const { addFiles } = useJobStore.getState();
    addFiles([makeFile("/a/foo.jpg"), makeFile("/a/bar.png")]);
    const { files, view } = useJobStore.getState();
    expect(files.length).toBe(2);
    expect(view).toBe("list");
  });

  it("deduplicates by path when adding the same file twice", () => {
    const { addFiles } = useJobStore.getState();
    const file = makeFile("/a/dupe.jpg");
    addFiles([file]);
    addFiles([{ ...file, id: uid() }]);
    expect(useJobStore.getState().files.length).toBe(1);
  });

  it("only adds fresh files when pre-existing file plus one new", () => {
    const { addFiles } = useJobStore.getState();
    const existing = makeFile("/a/existing.jpg");
    addFiles([existing]);
    const newFile = makeFile("/a/newfile.jpg");
    addFiles([{ ...existing, id: uid() }, newFile]);
    const { files } = useJobStore.getState();
    expect(files.length).toBe(2);
    expect(files.some((f) => f.path === newFile.path)).toBe(true);
  });
});


describe("removeFile", () => {
  it("removes the correct file by id", () => {
    const { addFiles, removeFile } = useJobStore.getState();
    const a = makeFile("/a/a.jpg");
    const b = makeFile("/a/b.jpg");
    addFiles([a, b]);
    removeFile(a.id);
    const { files } = useJobStore.getState();
    expect(files.length).toBe(1);
    expect(files[0].id).toBe(b.id);
  });

  it("switches to drop view when last file is removed", () => {
    const { addFiles, removeFile } = useJobStore.getState();
    const f = makeFile("/a/only.jpg");
    addFiles([f]);
    expect(useJobStore.getState().view).toBe("list");
    removeFile(f.id);
    expect(useJobStore.getState().view).toBe("drop");
    expect(useJobStore.getState().files.length).toBe(0);
  });
});


describe("clearFiles", () => {
  it("resets files array and switches to drop view", () => {
    const { addFiles, clearFiles } = useJobStore.getState();
    addFiles([makeFile("/a/x.jpg"), makeFile("/a/y.jpg")]);
    clearFiles();
    const { files, view } = useJobStore.getState();
    expect(files).toEqual([]);
    expect(view).toBe("drop");
  });
});


describe("toggleFileTarget", () => {
  it("adds a target when toggled on", () => {
    const { addFiles, toggleFileTarget } = useJobStore.getState();
    const file = makeFile("/a/img.jpg", "jpeg");
    addFiles([file]);
    toggleFileTarget(file.id, "png");
    const updated = useJobStore.getState().files.find((f) => f.id === file.id)!;
    expect(updated.targets.length).toBe(1);
    expect(updated.targets[0].format).toBe("png");
  });

  it("removes a target when toggled off", () => {
    const { addFiles, toggleFileTarget } = useJobStore.getState();
    const file = makeFile("/a/img.jpg", "jpeg");
    addFiles([file]);
    toggleFileTarget(file.id, "png");
    toggleFileTarget(file.id, "png");
    const updated = useJobStore.getState().files.find((f) => f.id === file.id)!;
    expect(updated.targets.length).toBe(0);
  });

  it("can have multiple targets on the same file", () => {
    const { addFiles, toggleFileTarget } = useJobStore.getState();
    const file = makeFile("/a/img.jpg", "jpeg");
    addFiles([file]);
    toggleFileTarget(file.id, "png");
    toggleFileTarget(file.id, "web_p");
    const updated = useJobStore.getState().files.find((f) => f.id === file.id)!;
    expect(updated.targets.length).toBe(2);
  });
});


describe("applyPreset", () => {
  const testPreset: Preset = {
    id: "p1",
    name: "Web",
    targetFormat: "png",
    quality: 82,
    maxDimension: null,
    stripMetadata: true,
    builtin: true,
  };

  it("adds a target to compatible files", () => {
    const { addFiles, applyPreset } = useJobStore.getState();
    addFiles([makeFile("/a/img.jpg", "jpeg")]);
    applyPreset(testPreset);
    const { files } = useJobStore.getState();
    expect(files[0].targets.length).toBe(1);
    expect(files[0].targets[0].format).toBe("png");
    expect(files[0].targets[0].quality).toBe(82);
  });

  it("does not duplicate when applied twice for the same format", () => {
    const { addFiles, applyPreset } = useJobStore.getState();
    addFiles([makeFile("/a/img.jpg", "jpeg")]);
    applyPreset(testPreset);
    applyPreset(testPreset);
    const { files } = useJobStore.getState();
    expect(files[0].targets.length).toBe(1);
  });

  it("does not add target to files with incompatible format", () => {
    const { addFiles, applyPreset } = useJobStore.getState();
    addFiles([makeFile("/a/doc.csv", "csv")]);
    applyPreset(testPreset);
    const { files } = useJobStore.getState();
    expect(files[0].targets.length).toBe(0);
  });
});


describe("updateConversion", () => {
  it("updates nested conversions for a file", () => {
    const { addFiles, updateConversion } = useJobStore.getState();
    const file = makeFile("/a/img.jpg");
    addFiles([file]);
    updateConversion(file.id, "target-1", {
      status: "done",
      outputPath: "/out.jpg",
      error: null,
    });
    const updated = useJobStore.getState().files.find((f) => f.id === file.id)!;
    expect(updated.conversions["target-1"].status).toBe("done");
    expect(updated.conversions["target-1"].outputPath).toBe("/out.jpg");
  });
});


describe("startBatch / oneBatchJobDone", () => {
  it("sets activeJobId and pendingBatchJobs", () => {
    useJobStore.getState().startBatch("batch-1", 3);
    expect(useJobStore.getState().activeJobId).toBe("batch-1");
    expect(useJobStore.getState().pendingBatchJobs).toBe(3);
  });

  it("returns false and decrements until last job", () => {
    useJobStore.getState().startBatch("batch-1", 2);
    const result1 = useJobStore.getState().oneBatchJobDone();
    expect(result1).toBe(false);
    expect(useJobStore.getState().pendingBatchJobs).toBe(1);
    expect(useJobStore.getState().activeJobId).toBe("batch-1");
  });

  it("returns true and clears activeJobId when last job done", () => {
    useJobStore.getState().startBatch("batch-1", 1);
    const result = useJobStore.getState().oneBatchJobDone();
    expect(result).toBe(true);
    expect(useJobStore.getState().pendingBatchJobs).toBe(0);
    expect(useJobStore.getState().activeJobId).toBeNull();
  });
});


describe("updateSettings", () => {
  it("merges partial settings without overwriting unchanged fields", () => {
    useJobStore.getState().updateSettings({ defaultQuality: 72 });
    const { settings } = useJobStore.getState();
    expect(settings.defaultQuality).toBe(72);
    expect(settings.stripMetadataDefault).toBe(true);
    expect(settings.maxParallelJobs).toBe(4);
  });
});


describe("toasts", () => {
  it("addToast appends to the list", () => {
    useJobStore.getState().addToast({ type: "success", message: "done" });
    expect(useJobStore.getState().toasts.length).toBe(1);
    expect(useJobStore.getState().toasts[0].message).toBe("done");
    expect(useJobStore.getState().toasts[0].type).toBe("success");
  });

  it("removeToast removes by id and keeps the other", () => {
    const { addToast, removeToast } = useJobStore.getState();
    addToast({ type: "info", message: "first" });
    addToast({ type: "error", message: "second" });
    const toasts = useJobStore.getState().toasts;
    expect(toasts.length).toBe(2);
    const firstId = toasts[0].id;
    removeToast(firstId);
    const remaining = useJobStore.getState().toasts;
    expect(remaining.length).toBe(1);
    expect(remaining[0].message).toBe("second");
  });
});


describe("setActiveJobId", () => {
  it("sets and clears activeJobId", () => {
    useJobStore.getState().setActiveJobId("job-1");
    expect(useJobStore.getState().activeJobId).toBe("job-1");
    useJobStore.getState().setActiveJobId(null);
    expect(useJobStore.getState().activeJobId).toBeNull();
  });
});
