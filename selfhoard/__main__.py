import argparse
from pathlib import Path
import uvicorn
from .api import create_app


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8741)
    parser.add_argument('--data-dir', type=Path, default=Path(__file__).resolve().parent.parent / 'data')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    uvicorn.run(create_app(args.data_dir, root / 'frontend' / 'dist'), host='127.0.0.1',
                port=args.port, access_log=False)


if __name__ == '__main__':
    main()
