"""Translate EchoCore paths only at the GPT-SoVITS request boundary."""
import os
import ntpath
import posixpath

from config import init_settings


def _path_module(path):
    return ntpath if ntpath.splitdrive(path)[0] or "\\" in path else posixpath


def map_sovits_path(path, settings=None):
    if not path:
        return path
    settings = init_settings() if settings is None else settings
    remote = (settings.get("sovits_model_dir") or "").strip()
    base = settings.get("base_dir") or ""
    if not remote or not base:
        return path
    local = _path_module(base) if posixpath.isabs(base) or ntpath.isabs(base) else os.path
    # Resolve relative local roots just as filesystem scanning does.
    root = local.abspath(base)
    if local is ntpath and local.splitdrive(root)[0] and not local.splitdrive(root)[1]:
        root += local.sep
    source = local.abspath(path)
    try:
        if local.normcase(local.commonpath([root, source])) != local.normcase(root):
            return path
    except ValueError:
        return path
    relative = local.relpath(source, root)
    target = _path_module(remote)
    parts = relative.split(local.sep)
    return target.normpath(target.join(remote, *parts))


def map_sovits_audio_params(params):
    settings = init_settings()
    result = dict(params)
    if result.get("ref_audio_path"):
        result["ref_audio_path"] = map_sovits_path(result["ref_audio_path"], settings)
    if result.get("aux_ref_audio_paths"):
        result["aux_ref_audio_paths"] = [
            map_sovits_path(path, settings) for path in result["aux_ref_audio_paths"]
        ]
    return result
