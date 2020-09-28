import { DefaultIconReact } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@phosphor/commands';
import * as React from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { classes } from 'typestyle';
import { CommandIDs } from '../commandsAndMenu';
import { LoggerContext } from '../logger';
import { GitExtension } from '../model';
import {
  actionButtonClass,
  commitClass,
  commitDetailClass,
  commitDetailFileClass,
  commitDetailHeaderClass,
  commitOverviewNumbersClass,
  deletionsIconClass,
  fileListClass,
  iconClass,
  insertionsIconClass
} from '../style/SinglePastCommitInfo';
import { Git } from '../tokens';
import { ActionButton } from './ActionButton';
import { isDiffSupported } from './diff/Diff';
import { FilePath } from './FilePath';
import { ResetRevertDialog } from './ResetRevertDialog';

const ITEM_HEIGHT = 24; // File list item height
const MAX_VISIBLE_FILES = 20; // Maximal number of file display at once

/**
 * Interface describing component properties.
 */
export interface ISinglePastCommitInfoProps {
  /**
   * Commit data.
   */
  commit: Git.ISingleCommitInfo;

  /**
   * Extension data model.
   */
  model: GitExtension;

  /**
   * Jupyter App commands registry
   */
  commands: CommandRegistry;
}

/**
 * Interface describing component state.
 */
export interface ISinglePastCommitInfoState {
  /**
   * Commit information.
   */
  info: string;

  /**
   * Number of modified files.
   */
  numFiles: string;

  /**
   * Number of insertions.
   */
  insertions: string;

  /**
   * Number of deletions.
   */
  deletions: string;

  /**
   * A list of modified files.
   */
  modifiedFiles: Git.ICommitModifiedFile[];

  /**
   * Current loading state for loading individual commit information.
   */
  loadingState: 'loading' | 'error' | 'success';

  /**
   * Boolean indicating whether to display a dialog for reseting or reverting a commit.
   */
  resetRevertDialog: boolean;

  /**
   * Reset/revert dialog mode (i.e., whether the dialog should be for reseting to or reverting an individual commit).
   */
  resetRevertAction: 'reset' | 'revert';
}

/**
 * React component for rendering information about an individual commit.
 */
export class SinglePastCommitInfo extends React.Component<
  ISinglePastCommitInfoProps,
  ISinglePastCommitInfoState
> {
  /**
   * Returns a React component for information about an individual commit.
   *
   * @param props - component properties
   * @returns React component
   */
  constructor(props: ISinglePastCommitInfoProps) {
    super(props);
    this.state = {
      info: '',
      numFiles: '',
      insertions: '',
      deletions: '',
      modifiedFiles: [],
      loadingState: 'loading',
      resetRevertDialog: false,
      resetRevertAction: 'reset'
    };
  }

  /**
   * Callback invoked immediately after mounting a component (i.e., inserting into a tree).
   */
  async componentDidMount(): Promise<void> {
    try {
      const log = await this.props.model.detailedLog(this.props.commit.commit);

      this.setState({
        info: log.modified_file_note,
        numFiles: log.modified_files_count,
        insertions: log.number_of_insertions,
        deletions: log.number_of_deletions,
        modifiedFiles: log.modified_files,
        loadingState: 'success'
      });
    } catch (err) {
      console.error(
        `Error while getting detailed log for commit ${this.props.commit.commit} and path ${this.props.model.pathRepository}`,
        err
      );
      this.setState({ loadingState: 'error' });
      return;
    }
  }

  /**
   * Renders the component.
   *
   * @returns React element
   */
  render(): React.ReactElement {
    if (this.state.loadingState === 'loading') {
      return <div>...</div>;
    }
    if (this.state.loadingState === 'error') {
      return <div>Error loading commit data</div>;
    }
    return (
      <div>
        <div className={commitClass}>
          <div className={commitOverviewNumbersClass}>
            <span title="# Files Changed">
              <DefaultIconReact name="file" className={iconClass} />
              {this.state.numFiles}
            </span>
            <span title="# Insertions">
              <DefaultIconReact
                name="git-insertionsMade"
                className={classes(iconClass, insertionsIconClass)}
              />
              {this.state.insertions}
            </span>
            <span title="# Deletions">
              <DefaultIconReact
                name="git-deletionsMade"
                className={classes(iconClass, deletionsIconClass)}
              />
              {this.state.deletions}
            </span>
          </div>
        </div>
        <div className={commitDetailClass}>
          <div className={commitDetailHeaderClass}>
            Changed
            <ActionButton
              className={actionButtonClass}
              iconName="git-discard"
              title="Revert changes introduced by this commit"
              onClick={this._onRevertClick}
            />
            <ActionButton
              className={actionButtonClass}
              iconName="git-rewind"
              title="Discard changes introduced *after* this commit (hard reset)"
              onClick={this._onResetClick}
            />
            <LoggerContext.Consumer>
              {logger => (
                <ResetRevertDialog
                  open={this.state.resetRevertDialog}
                  action={this.state.resetRevertAction}
                  model={this.props.model}
                  logger={logger}
                  commit={this.props.commit}
                  onClose={this._onResetRevertDialogClose}
                />
              )}
            </LoggerContext.Consumer>
          </div>
          {this.state.modifiedFiles.length > 0 && (
            <FixedSizeList
              className={fileListClass}
              height={
                Math.min(MAX_VISIBLE_FILES, this.state.modifiedFiles.length) *
                ITEM_HEIGHT
              }
              innerElementType="ul"
              itemCount={this.state.modifiedFiles.length}
              itemData={this.state.modifiedFiles}
              itemKey={(index, data) => data[index].modified_file_path}
              itemSize={ITEM_HEIGHT}
              style={{ overflowX: 'hidden' }}
              width={'auto'}
            >
              {this._renderFile}
            </FixedSizeList>
          )}
        </div>
      </div>
    );
  }

  /**
   * Renders a modified file.
   *
   * @param props Row properties
   * @returns React element
   */
  private _renderFile = (props: ListChildComponentProps): JSX.Element => {
    const { data, index, style } = props;
    const file = data[index];
    const path = file.modified_file_path;
    const flg = isDiffSupported(path) || !file.is_binary;
    return (
      <li
        className={commitDetailFileClass}
        onClick={this._onDiffClickFactory(path, flg)}
        style={style}
        title={path}
      >
        <FilePath filepath={path} />
        {flg ? (
          <ActionButton iconName="git-diff" title="View file changes" />
        ) : null}
      </li>
    );
  };

  /**
   * Callback invoked upon a clicking a button to revert changes.
   *
   * @param event - event object
   */
  private _onRevertClick = (event: any): void => {
    event.stopPropagation();
    this.setState({
      resetRevertDialog: true,
      resetRevertAction: 'revert'
    });
  };

  /**
   * Callback invoked upon a clicking a button to reset changes.
   *
   * @param event - event object
   */
  private _onResetClick = (event: any): void => {
    event.stopPropagation();
    this.setState({
      resetRevertDialog: true,
      resetRevertAction: 'reset'
    });
  };

  /**
   * Callback invoked upon closing a dialog to reset or revert changes.
   */
  private _onResetRevertDialogClose = (): void => {
    this.setState({
      resetRevertDialog: false
    });
  };

  /**
   * Returns a callback to be invoked clicking a button to display a file diff.
   *
   * @param fpath - modified file path
   * @param bool - boolean indicating whether a displaying a diff is supported for this file path
   * @returns callback
   */
  private _onDiffClickFactory(fpath: string, bool: boolean) {
    const self = this;
    if (bool) {
      return onShowDiff;
    }
    return onClick;

    /**
     * Callback invoked upon clicking a button to display a file diff.
     *
     * @private
     * @param event - event object
     */
    function onClick(event: React.MouseEvent<HTMLLIElement, MouseEvent>) {
      // Prevent the commit component from being collapsed:
      event.stopPropagation();
    }

    /**
     * Callback invoked upon clicking a button to display a file diff.
     *
     * @private
     * @param event - event object
     */
    async function onShowDiff(
      event: React.MouseEvent<HTMLLIElement, MouseEvent>
    ) {
      // Prevent the commit component from being collapsed:
      event.stopPropagation();

      try {
        self.props.commands.execute(CommandIDs.gitFileDiff, {
          filePath: fpath,
          isText: bool,
          context: {
            previousRef: {
              gitRef: self.props.commit.pre_commit
            },
            currentRef: {
              gitRef: self.props.commit.commit
            }
          }
        });
      } catch (err) {
        console.error(`Failed to open diff view for ${fpath}.\n${err}`);
      }
    }
  }
}
